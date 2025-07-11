use std::path::{Path, PathBuf};
use std::io;
use walkdir::WalkDir;

#[derive(Debug, Clone)]
pub struct Vault {
    path: PathBuf,
}

impl Vault {
    pub fn new(path: PathBuf) -> io::Result<Self> {
        if !path.exists() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                "Vault path does not exist",
            ));
        }
        
        if !path.is_dir() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Vault path is not a directory",
            ));
        }
        
        Ok(Self { path })
    }
    
    pub fn path(&self) -> &Path {
        &self.path
    }
    
    pub fn list_markdown_files(&self) -> io::Result<Vec<PathBuf>> {
        let mut items = Vec::new();
        
        println!("🔍 Scanning vault directory: {:?}", self.path);
        
        for entry in WalkDir::new(&self.path)
            .follow_links(true)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            
            // Skip the root directory itself
            if path == self.path {
                println!("⏭️ Skipping root directory");
                continue;
            }
            
            // Include directories, markdown files, and images
            if path.is_dir() {
                println!("📁 Found directory: {:?}", path);
                items.push(path.to_path_buf());
            } else if path.is_file() {
                let ext = path.extension().and_then(|s| s.to_str());
                println!("📄 Found file: {:?}, extension: {:?}", path, ext);
                if ext == Some("md") {
                    println!("✅ Adding markdown file: {:?}", path);
                    items.push(path.to_path_buf());
                } else if matches!(ext, Some("png") | Some("jpg") | Some("jpeg") | Some("gif")) {
                    println!("🖼️ Adding image file: {:?}", path);
                    items.push(path.to_path_buf());
                }
            }
        }
        
        println!("📊 Total items found: {}", items.len());
        items.sort();
        Ok(items)
    }
    
    pub fn read_file(&self, relative_path: &Path) -> io::Result<String> {
        let full_path = self.path.join(relative_path);
        std::fs::read_to_string(full_path)
    }
    
    pub fn write_file(&self, relative_path: &Path, content: &str) -> io::Result<()> {
        let full_path = self.path.join(relative_path);
        
        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        std::fs::write(full_path, content)
    }
}