#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{State, Manager, Emitter};
use serde::{Deserialize, Serialize};
use chrono;
use notify::{Watcher, RecursiveMode, Config};
use std::sync::mpsc::channel;
use std::time::Duration;

mod vault;
mod editor;
mod pdf_export;
mod auth;
mod ai_settings;
mod ai_stream;

use vault::Vault;
use editor::EditorManager;
use pdf_export::{PdfExporter, ExportOptions};
use ai_settings::{save_ai_settings, get_ai_settings, test_ai_connection};
use ai_stream::{send_ai_chat, search_notes_by_name, test_messages, debug_send_ai_chat};

#[derive(Debug, Serialize, Deserialize)]
pub struct NoteSearchResult {
    pub name: String,
    pub path: String,
}

pub struct AppState {
    vault: Arc<Mutex<Option<Vault>>>,
    editor: EditorManager,
    watcher: Arc<Mutex<Option<notify::RecommendedWatcher>>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct VaultInfo {
    path: String,
    name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct FileInfo {
    path: String,
    name: String,
    is_dir: bool,
    extension: Option<String>,
    depth: usize,
    parent_path: Option<String>,
    created: Option<i64>,  // Unix timestamp
    modified: Option<i64>, // Unix timestamp
}

#[derive(Debug, Serialize, Deserialize)]
struct FileTree {
    files: Vec<FileInfo>,
}

#[tauri::command]
async fn open_vault(path: String, state: State<'_, AppState>) -> Result<VaultInfo, String> {
    let vault_path = PathBuf::from(&path);
    
    if !vault_path.exists() {
        return Err("Vault directory does not exist".to_string());
    }
    
    if !vault_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }
    
    let vault = Vault::new(vault_path.clone())
        .map_err(|e| format!("Failed to open vault: {}", e))?;
    
    let vault_info = VaultInfo {
        path: path.clone(),
        name: vault_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Untitled")
            .to_string(),
    };
    
    let mut vault_lock = state.vault.lock().await;
    *vault_lock = Some(vault);
    
    Ok(vault_info)
}

#[tauri::command]
async fn start_file_watcher(vault_path: String, app: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    // Stop any existing watcher
    let mut watcher_lock = state.watcher.lock().await;
    *watcher_lock = None;
    
    let path = PathBuf::from(&vault_path);
    
    // Set up file watcher for the vault
    let (tx, rx) = channel();
    let app_handle = app.clone();
    
    // Spawn a thread to handle file system events
    std::thread::spawn(move || {
        use std::time::Instant;
        let mut last_emit_time = Instant::now();
        let mut pending_event = false;
        
        loop {
            // Check for events with a timeout
            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(Ok(event)) => {
                    println!("📁 File system event: {:?}", event);
                    pending_event = true;
                    last_emit_time = Instant::now();
                }
                Ok(Err(e)) => println!("⚠️ Watch error: {:?}", e),
                Err(_) => {
                    // Timeout - check if we should emit
                    if pending_event && last_emit_time.elapsed() > Duration::from_millis(300) {
                        println!("📢 Emitting vault-files-changed event");
                        let _ = app_handle.emit("vault-files-changed", ());
                        pending_event = false;
                    }
                }
            }
        }
    });
    
    // Create and start the watcher
    let mut watcher = notify::recommended_watcher(tx)
        .map_err(|e| format!("Failed to create file watcher: {}", e))?;
    
    watcher.watch(&path, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch vault directory: {}", e))?;
    
    *watcher_lock = Some(watcher);
    println!("✅ File watcher started for: {}", vault_path);
    
    Ok(())
}

#[tauri::command]
async fn create_vault(path: String, state: State<'_, AppState>) -> Result<VaultInfo, String> {
    let vault_path = PathBuf::from(&path);
    
    if vault_path.exists() {
        return Err("Path already exists".to_string());
    }
    
    std::fs::create_dir_all(&vault_path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;
    
    open_vault(path, state).await
}

#[tauri::command]
async fn get_vault_info(state: State<'_, AppState>) -> Result<Option<VaultInfo>, String> {
    let vault_lock = state.vault.lock().await;
    
    match &*vault_lock {
        Some(vault) => {
            let path = vault.path();
            Ok(Some(VaultInfo {
                path: path.to_string_lossy().to_string(),
                name: path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("Untitled")
                    .to_string(),
            }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn select_folder_for_vault(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::sync::{Arc, Mutex};
    use std::sync::mpsc;
    use std::time::Duration;
    
    println!("🔍 Starting folder selection for vault...");
    
    let (tx, rx) = mpsc::channel();
    let tx = Arc::new(Mutex::new(Some(tx)));
    
    app.dialog()
        .file()
        .set_title("Select Vault Folder")
        .pick_folder(move |result| {
            println!("📁 Dialog callback received: {:?}", result);
            if let Some(sender) = tx.lock().unwrap().take() {
                let send_result = sender.send(result);
                println!("📤 Send result: {:?}", send_result);
            }
        });
    
    println!("⏳ Waiting for dialog response...");
    match rx.recv_timeout(Duration::from_secs(30)) {
        Ok(Some(path)) => {
            let path_str = path.to_string();
            println!("✅ Received path: {}", path_str);
            Ok(Some(path_str))
        },
        Ok(None) => {
            println!("❌ User cancelled dialog");
            Ok(None)
        },
        Err(e) => {
            println!("❌ Dialog timeout or error: {:?}", e);
            Err("Dialog timed out or failed".to_string())
        },
    }
}

#[tauri::command] 
async fn select_folder_for_create(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::sync::{Arc, Mutex};
    use std::sync::mpsc;
    use std::time::Duration;
    
    println!("🔍 Starting folder selection for create...");
    
    let (tx, rx) = mpsc::channel();
    let tx = Arc::new(Mutex::new(Some(tx)));
    
    app.dialog()
        .file()
        .set_title("Select Location for New Vault")
        .pick_folder(move |result| {
            println!("📁 Create dialog callback received: {:?}", result);
            if let Some(sender) = tx.lock().unwrap().take() {
                let send_result = sender.send(result);
                println!("📤 Create send result: {:?}", send_result);
            }
        });
    
    println!("⏳ Waiting for create dialog response...");
    match rx.recv_timeout(Duration::from_secs(30)) {
        Ok(Some(path)) => {
            let path_str = path.to_string();
            println!("✅ Create received path: {}", path_str);
            Ok(Some(path_str))
        },
        Ok(None) => {
            println!("❌ Create user cancelled dialog");
            Ok(None)
        },
        Err(e) => {
            println!("❌ Create dialog timeout or error: {:?}", e);
            Err("Dialog timed out or failed".to_string())
        },
    }
}

#[tauri::command]
async fn create_new_vault(parent_path: String, vault_name: String, state: State<'_, AppState>) -> Result<VaultInfo, String> {
    if vault_name.trim().is_empty() {
        return Err("Vault name cannot be empty".to_string());
    }
    
    let vault_path = PathBuf::from(parent_path).join(vault_name.trim());
    
    if vault_path.exists() {
        return Err(format!("Folder '{}' already exists", vault_name.trim()));
    }
    
    // Create the vault directory
    std::fs::create_dir_all(&vault_path)
        .map_err(|e| format!("Failed to create vault directory: {}", e))?;
    
    // Create a welcome note
    let welcome_content = format!(
        "# Welcome to {}\n\nThis is your new Aura vault! Start taking notes by creating new markdown files.\n\n## Getting Started\n\n- Create new notes by clicking the + button\n- Organize your thoughts in folders\n- All your notes are stored as plain markdown files\n\nHappy note-taking! ✨\n",
        vault_name.trim()
    );
    
    let welcome_path = vault_path.join("Welcome.md");
    std::fs::write(&welcome_path, welcome_content)
        .map_err(|e| format!("Failed to create welcome note: {}", e))?;
    
    // Now open the vault
    let vault_path_str = vault_path.to_string_lossy().to_string();
    open_vault(vault_path_str, state).await
}

#[tauri::command]
async fn get_file_tree(state: State<'_, AppState>) -> Result<FileTree, String> {
    let vault_lock = state.vault.lock().await;
    
    match &*vault_lock {
        Some(vault) => {
            let files = vault.list_markdown_files()
                .map_err(|e| format!("Failed to list files: {}", e))?;
            
            let mut file_infos = Vec::new();
            
            // Add all directories and files with hierarchy info
            for file_path in files {
                // Debug log
                println!("📄 Processing file: {:?}", file_path);
                
                // Get relative path from vault root
                let relative_path = match file_path.strip_prefix(vault.path()) {
                    Ok(rel_path) => rel_path,
                    Err(_) => {
                        println!("⚠️ Could not strip prefix from path: {:?}", file_path);
                        continue;
                    }
                };
                
                println!("📍 Relative path: {:?}", relative_path);
                
                // Calculate depth and parent
                let path_str = relative_path.to_string_lossy().to_string();
                let components: Vec<_> = relative_path.components().collect();
                let depth = components.len() - 1; // Depth is number of path segments minus 1
                let parent_path = if components.len() > 1 {
                    Some(relative_path.parent().unwrap().to_string_lossy().to_string())
                } else {
                    None
                };
                
                println!("🔍 File: {}, Components: {:?}, Depth: {}, Parent: {:?}", 
                    path_str, components, depth, parent_path);
                
                // Get file metadata
                let (created, modified) = match std::fs::metadata(&file_path) {
                    Ok(metadata) => {
                        let modified = metadata.modified()
                            .ok()
                            .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|duration| duration.as_secs() as i64);
                        
                        // Note: created() is not available on all platforms
                        let created = metadata.created()
                            .ok()
                            .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|duration| duration.as_secs() as i64);
                        
                        (created, modified)
                    }
                    Err(e) => {
                        println!("⚠️ Failed to get metadata for {:?}: {}", file_path, e);
                        (None, None)
                    }
                };
                
                let file_info = FileInfo {
                    path: path_str,
                    name: relative_path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string(),
                    is_dir: file_path.is_dir(),
                    extension: file_path.extension().and_then(|s| s.to_str()).map(|s| s.to_string()),
                    depth: components.len(),
                    parent_path,
                    created,
                    modified,
                };
                
                println!("✅ Created FileInfo: {:?}", file_info);
                file_infos.push(file_info);
            }
            
            // Sort files for consistent tree view
            file_infos.sort_by(|a, b| a.path.cmp(&b.path));
            
            Ok(FileTree { files: file_infos })
        }
        None => Err("Vault not open".to_string()),
    }
}

#[tauri::command]
async fn read_file_content(file_path: String, state: State<'_, AppState>) -> Result<String, String> {
    println!("📖 read_file_content called with path: {}", file_path);

    let vault_lock = state.vault.lock().await;

    match &*vault_lock {
        Some(vault) => {
            let path = std::path::Path::new(&file_path);
            println!("📁 Vault path: {:?}", vault.path());
            println!("📄 Reading relative path: {:?}", path);

            vault.read_file(path)
                .map_err(|e| {
                    println!("❌ Failed to read file: {}", e);
                    format!("Failed to read file: {}", e)
                })
        }
        None => Err("No vault opened".to_string()),
    }
}

#[tauri::command]
async fn write_file_content(file_path: String, content: String, state: State<'_, AppState>) -> Result<(), String> {
    let vault_lock = state.vault.lock().await;

    match &*vault_lock {
        Some(vault) => {
            let path = std::path::Path::new(&file_path);
            vault.write_file(path, &content)
                .map_err(|e| format!("Failed to write file: {}", e))
        }
        None => Err("No vault opened".to_string()),
    }
}

#[tauri::command]
async fn fetch_image_as_base64(url: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch image: {}", e))?;
    
    // Get content type before consuming response
    let content_type = response.headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/png")
        .to_string();
    
    let bytes = response.bytes()
        .await
        .map_err(|e| format!("Failed to read image bytes: {}", e))?;
    
    // Use the newer base64 API
    use base64::{Engine as _, engine::general_purpose};
    let base64_string = general_purpose::STANDARD.encode(&bytes);
    
    Ok(format!("data:{};base64,{}", content_type, base64_string))
}

#[tauri::command]
async fn create_new_file(file_name: String, state: State<'_, AppState>) -> Result<(), String> {
    println!("📝 create_new_file called with name: {}", file_name);

    let vault_lock = state.vault.lock().await;

    match &*vault_lock {
        Some(vault) => {
            let path = std::path::Path::new(&file_name);
            println!("📁 Vault path: {:?}", vault.path());
            println!("📄 Creating file: {:?}", path);

            // Create default content for new file
            let default_content = format!("# {}",
                path.file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Untitled")
            );

            vault.write_file(path, &default_content)
                .map_err(|e| {
                    println!("❌ Failed to create file: {}", e);
                    format!("Failed to create file: {}", e)
                })
        }
        None => Err("No vault opened".to_string()),
    }
}

#[tauri::command]
async fn create_new_folder(folder_name: String, state: State<'_, AppState>) -> Result<(), String> {
    println!("📂 create_new_folder called with name: {}", folder_name);

    let vault_lock = state.vault.lock().await;

    match &*vault_lock {
        Some(vault) => {
            let folder_path = vault.path().join(&folder_name);
            println!("📁 Creating folder at: {:?}", folder_path);

            std::fs::create_dir_all(&folder_path)
                .map_err(|e| {
                    println!("❌ Failed to create folder: {}", e);
                    format!("Failed to create folder: {}", e)
                })
        }
        None => Err("No vault opened".to_string()),
    }
}

#[tauri::command]
async fn delete_file(file_path: String, state: State<'_, AppState>) -> Result<(), String> {
    println!("🗑️ delete_file called with path: {}", file_path);

    let vault_lock = state.vault.lock().await;

    match &*vault_lock {
        Some(vault) => {
            let path = vault.path().join(&file_path);
            println!("📁 Deleting file at: {:?}", path);

            if path.is_file() {
                std::fs::remove_file(&path)
                    .map_err(|e| {
                        println!("❌ Failed to delete file: {}", e);
                        format!("Failed to delete file: {}", e)
                    })
            } else {
                Err("Path is not a file".to_string())
            }
        }
        None => Err("No vault opened".to_string()),
    }
}

#[tauri::command]
async fn move_file(old_path: String, new_path: String, state: State<'_, AppState>) -> Result<(), String> {
    println!("📦 move_file called: {} -> {}", old_path, new_path);

    let vault_lock = state.vault.lock().await;

    match &*vault_lock {
        Some(vault) => {
            let old_full_path = vault.path().join(&old_path);
            let new_full_path = vault.path().join(&new_path);
            
            println!("📁 Moving file: {:?} -> {:?}", old_full_path, new_full_path);

            // Create parent directories if they don't exist
            if let Some(parent) = new_full_path.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }

            std::fs::rename(&old_full_path, &new_full_path)
                .map_err(|e| {
                    println!("❌ Failed to move file: {}", e);
                    format!("Failed to move file: {}", e)
                })
        }
        None => Err("No vault opened".to_string()),
    }
}

#[tauri::command]
async fn rename_file(old_path: String, new_path: String, state: State<'_, AppState>) -> Result<(), String> {
    println!("✏️ rename_file called: {} -> {}", old_path, new_path);

    let vault_lock = state.vault.lock().await;

    match &*vault_lock {
        Some(vault) => {
            let old_full_path = vault.path().join(&old_path);
            let new_full_path = vault.path().join(&new_path);
            
            println!("📁 Renaming file: {:?} -> {:?}", old_full_path, new_full_path);

            // Create parent directories if they don't exist
            if let Some(parent) = new_full_path.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }

            std::fs::rename(&old_full_path, &new_full_path)
                .map_err(|e| {
                    println!("❌ Failed to rename file: {}", e);
                    format!("Failed to rename file: {}", e)
                })
        }
        None => Err("No vault opened".to_string()),
    }
}

#[tauri::command]
async fn get_last_vault(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let config_dir = match app.path().app_config_dir() {
        Ok(dir) => dir,
        Err(e) => return Err(format!("Failed to get config directory: {}", e)),
    };
    
    let last_vault_file = config_dir.join(".aura").join("last_vault.txt");
    
    if last_vault_file.exists() {
        match std::fs::read_to_string(&last_vault_file) {
            Ok(path) => {
                // Check if the vault still exists
                if PathBuf::from(&path).exists() {
                    Ok(Some(path))
                } else {
                    // Vault no longer exists, remove the file
                    let _ = std::fs::remove_file(&last_vault_file);
                    Ok(None)
                }
            },
            Err(_) => Ok(None),
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn save_last_vault(app: tauri::AppHandle, vault_path: String) -> Result<(), String> {
    let config_dir = match app.path().app_config_dir() {
        Ok(dir) => dir,
        Err(e) => return Err(format!("Failed to get config directory: {}", e)),
    };
    
    let aura_dir = config_dir.join(".aura");
    
    // Create .aura directory if it doesn't exist
    if !aura_dir.exists() {
        std::fs::create_dir_all(&aura_dir)
            .map_err(|e| format!("Failed to create .aura directory: {}", e))?;
    }
    
    let last_vault_file = aura_dir.join("last_vault.txt");
    
    std::fs::write(&last_vault_file, vault_path)
        .map_err(|e| format!("Failed to save last vault: {}", e))
}

#[tauri::command]
async fn save_pasted_image(
    image_data: String, // Base64 encoded
    extension: String,  // png, jpg, or gif
    state: State<'_, AppState>
) -> Result<String, String> {
    use chrono::Local;
    use base64::{Engine as _, engine::general_purpose};
    
    println!("📸 save_pasted_image called with extension: {}", extension);
    
    let vault_lock = state.vault.lock().await;
    
    match &*vault_lock {
        Some(vault) => {
            // Create files directory if it doesn't exist
            let files_dir = vault.path().join("files");
            std::fs::create_dir_all(&files_dir)
                .map_err(|e| format!("Failed to create files directory: {}", e))?;
            
            // Generate filename with timestamp
            let timestamp = Local::now().format("%Y%m%d%H%M%S").to_string();
            let filename = format!("Pasted image {}.{}", timestamp, extension);
            let file_path = files_dir.join(&filename);
            
            println!("💾 Saving image to: {:?}", file_path);
            
            // Decode base64 and save file
            let image_bytes = general_purpose::STANDARD.decode(&image_data)
                .map_err(|e| format!("Failed to decode base64: {}", e))?;
            
            std::fs::write(&file_path, image_bytes)
                .map_err(|e| format!("Failed to write image file: {}", e))?;
            
            println!("✅ Image saved successfully: {}", filename);
            Ok(filename)
        }
        None => Err("No vault opened".to_string()),
    }
}

#[tauri::command]
async fn read_image_as_base64(
    file_path: String,
    state: State<'_, AppState>
) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose};
    
    println!("🖼️ read_image_as_base64 called with path: {}", file_path);
    
    let vault_lock = state.vault.lock().await;
    
    match &*vault_lock {
        Some(vault) => {
            let full_path = vault.path().join(&file_path);
            println!("📁 Reading image from: {:?}", full_path);
            
            // Read the file as bytes
            let image_bytes = std::fs::read(&full_path)
                .map_err(|e| format!("Failed to read image file: {}", e))?;
            
            // Determine content type from extension
            let extension = full_path.extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("png")
                .to_lowercase();
            
            let content_type = match extension.as_str() {
                "jpg" | "jpeg" => "image/jpeg",
                "png" => "image/png",
                "gif" => "image/gif",
                _ => "image/png"
            };
            
            // Encode to base64
            let base64_string = general_purpose::STANDARD.encode(&image_bytes);
            
            Ok(format!("data:{};base64,{}", content_type, base64_string))
        }
        None => Err("No vault opened".to_string()),
    }
}

#[tauri::command]
async fn export_to_pdf(
    markdown_content: String,
    output_path: String,
    options: Option<ExportOptions>,
    state: State<'_, AppState>
) -> Result<(), String> {
    println!("📄 export_to_pdf called with output path: {}", output_path);
    
    let vault_lock = state.vault.lock().await;
    
    match &*vault_lock {
        Some(vault) => {
            let exporter = PdfExporter::new(vault.path().to_path_buf());
            let export_options = options.unwrap_or_default();
            
            exporter.export_to_pdf(
                &markdown_content,
                &PathBuf::from(&output_path),
                export_options
            ).await
        }
        None => Err("No vault opened".to_string()),
    }
}

#[tauri::command]
async fn export_to_html(
    markdown_content: String,
    output_path: String,
    options: Option<ExportOptions>,
    state: State<'_, AppState>
) -> Result<(), String> {
    println!("📄 export_to_html called with output path: {}", output_path);
    
    let vault_lock = state.vault.lock().await;
    
    match &*vault_lock {
        Some(vault) => {
            let export_options = options.unwrap_or_default();
            
            pdf_export::export_to_html(
                &markdown_content,
                &PathBuf::from(&output_path),
                vault.path(),
                export_options
            ).await
        }
        None => Err("No vault opened".to_string()),
    }
}

#[tauri::command]
async fn export_to_word(
    markdown_content: String,
    output_path: String,
    options: Option<ExportOptions>,
    state: State<'_, AppState>
) -> Result<(), String> {
    println!("📄 export_to_word called with output path: {}", output_path);
    
    let vault_lock = state.vault.lock().await;
    
    match &*vault_lock {
        Some(vault) => {
            let export_options = options.unwrap_or_default();
            
            pdf_export::export_to_word(
                &markdown_content,
                &PathBuf::from(&output_path),
                vault.path(),
                export_options
            ).await
        }
        None => Err("No vault opened".to_string()),
    }
}

#[tauri::command]
async fn export_chat_to_vault(
    state: State<'_, AppState>,
    content: String,
    filename: Option<String>
) -> Result<String, String> {
    let vault_lock = state.vault.lock().await;
    
    match &*vault_lock {
        Some(vault) => {
            let vault_path = vault.path();
            let chat_history_dir = vault_path.join("Chat History");
            
            // Create Chat History directory if it doesn't exist
            if !chat_history_dir.exists() {
                std::fs::create_dir(&chat_history_dir)
                    .map_err(|e| format!("Failed to create Chat History directory: {}", e))?;
            }
            
            // Generate filename with timestamp if not provided
            let file_name = filename.unwrap_or_else(|| {
                let now = chrono::Local::now();
                format!("chat-{}.md", now.format("%Y-%m-%d_%H-%M-%S"))
            });
            
            let file_path = chat_history_dir.join(&file_name);
            
            // Write the chat content to the file
            std::fs::write(&file_path, content)
                .map_err(|e| format!("Failed to write chat file: {}", e))?;
            
            Ok(file_path.to_string_lossy().to_string())
        }
        None => Err("No vault is currently open".to_string()),
    }
}

#[tauri::command]
async fn select_export_location(
    app: tauri::AppHandle,
    file_name: String,
    extension: String
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::sync::{Arc, Mutex};
    use std::sync::mpsc;
    use std::time::Duration;
    
    println!("🔍 Starting file save dialog for export...");
    
    let (tx, rx) = mpsc::channel();
    let tx = Arc::new(Mutex::new(Some(tx)));
    
    app.dialog()
        .file()
        .set_title(&format!("Export as {}", extension.to_uppercase()))
        .set_file_name(&format!("{}.{}", file_name, extension))
        .save_file(move |result| {
            println!("📁 Export dialog callback received: {:?}", result);
            if let Some(sender) = tx.lock().unwrap().take() {
                let send_result = sender.send(result);
                println!("📤 Export send result: {:?}", send_result);
            }
        });
    
    println!("⏳ Waiting for export dialog response...");
    match rx.recv_timeout(Duration::from_secs(30)) {
        Ok(Some(path)) => {
            let path_str = path.to_string();
            println!("✅ Export location selected: {}", path_str);
            Ok(Some(path_str))
        },
        Ok(None) => {
            println!("❌ User cancelled export dialog");
            Ok(None)
        },
        Err(e) => {
            println!("❌ Export dialog timeout or error: {:?}", e);
            Err("Dialog timed out or failed".to_string())
        },
    }
}

fn main() {
    let app_state = AppState {
        vault: Arc::new(Mutex::new(None)),
        editor: EditorManager::new(),
        watcher: Arc::new(Mutex::new(None)),
    };
    
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            open_vault,
            create_vault,
            get_vault_info,
            start_file_watcher,
            select_folder_for_vault,
            select_folder_for_create,
            create_new_vault,
            get_file_tree,
            read_file_content,
            write_file_content,
            fetch_image_as_base64,
            create_new_file,
            create_new_folder,
            delete_file,
            move_file,
            rename_file,
            get_last_vault,
            save_last_vault,
            save_pasted_image,
            read_image_as_base64,
            editor::save_editor_preference,
            editor::get_editor_preferences,
            editor::list_theme_files,
            editor::open_note,
            editor::search_by_tag,
            editor::get_embedded_block,
            editor::create_theme_directory,
            editor::update_editor_state,
            editor::get_editor_state,
            export_to_pdf,
            export_to_html,
            export_to_word,
            export_chat_to_vault,
            select_export_location,
            save_ai_settings,
            get_ai_settings,
            test_ai_connection,
            send_ai_chat,
            search_notes_by_name,
            test_messages,
            debug_send_ai_chat,
        ])
        .setup(|_app| {
            // Any initial setup can go here
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}