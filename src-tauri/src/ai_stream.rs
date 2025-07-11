use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use crate::ai_settings::get_ai_settings;

#[tauri::command]
pub async fn test_messages(messages: Vec<ChatMessage>) -> Result<String, String> {
    println!("\n=== TEST_MESSAGES CALLED ===");
    println!("Received {} messages", messages.len());
    for (i, msg) in messages.iter().enumerate() {
        println!("Message {}: role='{}', content='{}'", i, msg.role, msg.content);
    }
    Ok(format!("Received {} messages", messages.len()))
}

#[tauri::command]
pub async fn debug_send_ai_chat(
    app: AppHandle,
    messages: Vec<ChatMessage>,
) -> Result<String, String> {
    println!("\n=== DEBUG_SEND_AI_CHAT CALLED ===");
    println!("Received {} messages", messages.len());
    
    if messages.is_empty() {
        return Err("Messages array is empty".to_string());
    }
    
    // Just echo back what we received
    let debug_info = format!(
        "Received {} messages. First message: role='{}', content='{}'",
        messages.len(),
        messages[0].role,
        messages[0].content
    );
    
    Ok(debug_info)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct StreamChunk {
    #[serde(rename = "type")]
    pub chunk_type: String, // "content", "error", "done"
    pub content: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIStreamChunk {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    delta: Delta,
}

#[derive(Debug, Deserialize)]
struct Delta {
    content: Option<String>,
}

#[tauri::command]
pub async fn send_ai_chat(
    app: AppHandle,
    messages: Vec<ChatMessage>,
) -> Result<String, String> {
    println!("\n=== SEND_AI_CHAT CALLED ===");
    println!("Starting AI chat...");
    
    // Debug the raw input
    println!("Messages type info: Vec<ChatMessage>");
    println!("Received {} messages", messages.len());
    
    if messages.is_empty() {
        println!("ERROR: Messages array is empty!");
        println!("This likely means the JavaScript array was not properly serialized");
        return Err("No messages provided".to_string());
    }
    
    for (i, msg) in messages.iter().enumerate() {
        println!("Message {}: role='{}', content_length={}", i, msg.role, msg.content.len());
        println!("  Content preview: {}", &msg.content[..msg.content.len().min(50)]);
    }
    
    // Get settings
    let settings = match get_ai_settings(app).await? {
        Some(s) => {
            println!("Got settings: endpoint={}, model={}", s.endpoint, s.model);
            s
        },
        None => {
            return Err("No AI settings configured".to_string());
        }
    };
    
    // Build request
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let url = format!("{}/chat/completions", settings.endpoint.trim_end_matches('/'));
    
    // Clone messages to ensure they're not moved
    let messages_clone = messages.clone();
    println!("Messages before JSON: {} items", messages_clone.len());
    
    let mut request_body = serde_json::json!({
        "model": settings.model,
        "messages": messages_clone,
        "temperature": settings.temperature,
        "max_tokens": settings.max_tokens,
        "stream": false
    });
    
    println!("Request body: {}", serde_json::to_string_pretty(&request_body).unwrap());
    
    // Handle Ollama's native API format (only if not using OpenAI compatibility endpoint)
    if (settings.endpoint.contains("ollama") || settings.endpoint.contains("11434")) 
        && !settings.endpoint.contains("/v1") 
        && !settings.endpoint.contains("chat/completions") {
        println!("Detected Ollama native endpoint, reformatting request...");
        // Ollama uses a different format for its native API
        let prompt = messages.last()
            .map(|m| m.content.clone())
            .unwrap_or_default();
        
        request_body = serde_json::json!({
            "model": settings.model,
            "prompt": prompt,
            "stream": false
        });
    } else {
        println!("Using OpenAI-compatible format");
    }
    
    let mut request = client.post(&url);
    
    // Add auth header if API key is present
    if let Some(api_key) = &settings.api_key {
        if !api_key.is_empty() {
            request = request.header("Authorization", format!("Bearer {}", api_key));
        }
    }
    
    request = request
        .header("Content-Type", "application/json")
        .json(&request_body);
    
    println!("Final request body being sent: {}", serde_json::to_string(&request_body).unwrap());
    
    // Send request and get response
    let response = match request.send().await {
        Ok(resp) => resp,
        Err(e) => {
            return Err(format!("Failed to connect: {}", e));
        }
    };
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        println!("API Error - Status: {}, Error: {}", status, error_text);
        println!("Request URL was: {}", url);
        println!("Request had {} messages", messages.len());
        return Err(format!("API error ({}): {}", status, error_text));
    }
    
    // Parse JSON response
    let response_text = response.text().await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    let json: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    // Extract content from response
    if let Some(choices) = json.get("choices").and_then(|c| c.as_array()) {
        if let Some(first_choice) = choices.first() {
            if let Some(content) = first_choice
                .get("message")
                .and_then(|m| m.get("content"))
                .and_then(|c| c.as_str())
            {
                return Ok(content.to_string());
            }
        }
    }
    
    // Handle Ollama format
    if let Some(response_content) = json.get("response").and_then(|r| r.as_str()) {
        return Ok(response_content.to_string());
    }
    
    Err("No content found in response".to_string())
}

#[tauri::command]
pub async fn search_notes_by_name(
    search_term: String,
    state: tauri::State<'_, crate::AppState>,
) -> Result<Vec<crate::NoteSearchResult>, String> {
    let vault_lock = state.vault.lock().await;
    
    match &*vault_lock {
        Some(vault) => {
            let files = vault.list_markdown_files()
                .map_err(|e| format!("Failed to list files: {}", e))?;
            
            let mut results = Vec::new();
            
            for file in files {
                let file_name = file.file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("");
                
                // Fuzzy match
                if file_name.to_lowercase().contains(&search_term.to_lowercase()) {
                    results.push(crate::NoteSearchResult {
                        name: file_name.to_string(),
                        path: file.strip_prefix(vault.path())
                            .unwrap_or(&file)
                            .to_string_lossy()
                            .to_string(),
                    });
                }
            }
            
            // Sort by relevance (exact matches first)
            results.sort_by(|a, b| {
                let a_exact = a.name.to_lowercase() == search_term.to_lowercase();
                let b_exact = b.name.to_lowercase() == search_term.to_lowercase();
                b_exact.cmp(&a_exact).then(a.name.cmp(&b.name))
            });
            
            Ok(results)
        }
        None => Err("No vault opened".to_string()),
    }
}