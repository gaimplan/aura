// Note: Channel import removed for simplified implementation
import { invoke } from '@tauri-apps/api/core';

export class OpenAISDK {
    constructor() {
        this.currentStream = null;
        this.settings = null;
        this.isInitialized = false;
    }
    
    async initialize() {
        try {
            console.log('Initializing OpenAI SDK...');
            this.settings = await invoke('get_ai_settings');
            this.isInitialized = !!this.settings;
            console.log('OpenAI SDK initialized:', this.isInitialized);
            return this.isInitialized;
        } catch (error) {
            console.error('Failed to initialize OpenAI SDK:', error);
            this.isInitialized = false;
            return false;
        }
    }
    
    async refreshSettings() {
        return await this.initialize();
    }
    
    getSettings() {
        return this.settings;
    }
    
    async sendChat(messages, options = {}) {
        if (!this.isInitialized) {
            throw new Error('SDK not initialized. Call initialize() first.');
        }
        
        console.log('Starting chat with messages:', messages.length);
        
        // Debug: Check if messages is actually an array
        console.log('Messages type:', typeof messages);
        console.log('Is array?', Array.isArray(messages));
        console.log('Messages:', messages);
        
        // Ensure messages is an array
        if (!Array.isArray(messages)) {
            console.error('Messages is not an array!');
            throw new Error('Messages must be an array');
        }
        
        // Validate each message
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            console.log(`Message ${i}:`, msg);
            if (!msg || typeof msg !== 'object') {
                throw new Error(`Invalid message at index ${i}: message must be an object`);
            }
            if (!msg.role || typeof msg.role !== 'string') {
                throw new Error(`Invalid message at index ${i}: missing or invalid role`);
            }
            if (!msg.content || typeof msg.content !== 'string') {
                throw new Error(`Invalid message at index ${i}: missing or invalid content`);
            }
        }
        
        try {
            console.log('Invoking send_ai_chat with:', {
                messages: messages,
                messagesStringified: JSON.stringify(messages)
            });
            
            const response = await invoke('send_ai_chat', {
                messages: messages
            });
            
            return response;
        } catch (error) {
            console.error('Chat error:', error);
            throw new Error(error.toString());
        }
    }
    
    async testConnection() {
        if (!this.isInitialized) {
            throw new Error('SDK not initialized');
        }
        
        return await invoke('test_ai_connection', {
            settings: this.settings
        });
    }
    
    formatMessages(userMessage, context = []) {
        const messages = [];
        
        // System message
        messages.push({
            role: 'system',
            content: 'You are a helpful AI assistant integrated into a note-taking app called Aura. You help users with their notes, writing, research, and questions. Always provide helpful, accurate, and relevant responses.'
        });
        
        // Add context if available
        if (context.length > 0) {
            const contextContent = context.map(note => {
                const title = note.title || note.name || 'Untitled Note';
                return `Note: ${title}\n${note.content}`;
            }).join('\n\n---\n\n');
            
            messages.push({
                role: 'system',
                content: `CURRENT CONTEXT - The user is currently viewing and asking about the following note(s):\n\n${contextContent}\n\nIMPORTANT: When the user says "this note" or "summarize this", they are referring to the note(s) shown above, NOT any notes mentioned in previous conversation history. Always prioritize the current context over conversation history.`
            });
        }
        
        // Add user message
        messages.push({
            role: 'user',
            content: userMessage
        });
        
        console.log('Formatted messages for AI:', {
            messageCount: messages.length,
            hasContext: context.length > 0,
            contextNotes: context.length
        });
        
        return messages;
    }
    
    // Utility method to estimate token count
    estimateTokens(text) {
        // Rough estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }
    
    // Check if context fits in token limit
    checkTokenLimit(messages, maxTokens = 4000) {
        const totalText = messages.map(m => m.content).join(' ');
        const estimatedTokens = this.estimateTokens(totalText);
        return estimatedTokens <= maxTokens;
    }
    
    // Truncate context to fit within token limits
    truncateContext(context, maxContextTokens = 2000) {
        if (context.length === 0) return context;
        
        let truncatedContext = [];
        let currentTokens = 0;
        
        for (const note of context) {
            const noteText = `Note: ${note.title || note.name || 'Untitled'}\n${note.content}`;
            const noteTokens = this.estimateTokens(noteText);
            
            if (currentTokens + noteTokens <= maxContextTokens) {
                truncatedContext.push(note);
                currentTokens += noteTokens;
            } else {
                // Try to include a truncated version of this note
                const availableTokens = maxContextTokens - currentTokens;
                const availableChars = availableTokens * 4 - 50; // Leave some buffer
                
                if (availableChars > 100) {
                    const truncatedNote = {
                        ...note,
                        content: note.content.substring(0, availableChars) + '...[truncated]'
                    };
                    truncatedContext.push(truncatedNote);
                }
                break;
            }
        }
        
        console.log(`Context truncated: ${context.length} -> ${truncatedContext.length} notes, ~${currentTokens} tokens`);
        return truncatedContext;
    }
    
    // Cancel current stream if running
    cancelStream() {
        if (this.currentStream) {
            this.currentStream = null;
            console.log('Stream cancelled');
        }
    }
    
    // Get available models (for supported providers)
    async getAvailableModels() {
        if (!this.isInitialized || !this.settings) {
            return [];
        }
        
        try {
            // For now, return common model names based on endpoint
            const endpoint = this.settings.endpoint.toLowerCase();
            
            if (endpoint.includes('openai.com')) {
                return [
                    'gpt-4',
                    'gpt-4-turbo-preview',
                    'gpt-3.5-turbo',
                    'gpt-3.5-turbo-16k'
                ];
            } else if (endpoint.includes('localhost:11434') || endpoint.includes('ollama')) {
                // TODO: Implement actual model fetching from Ollama API
                return [
                    'llama2',
                    'mistral',
                    'codellama',
                    'llama2:13b',
                    'mistral:7b'
                ];
            } else if (endpoint.includes('localhost:1234')) {
                // TODO: Implement actual model fetching from LM Studio API
                return [
                    'TheBloke/Mistral-7B-Instruct-v0.2-GGUF',
                    'TheBloke/Llama-2-7B-Chat-GGUF',
                    'TheBloke/CodeLlama-7B-Instruct-GGUF'
                ];
            }
            
            return [];
        } catch (error) {
            console.error('Failed to get available models:', error);
            return [];
        }
    }
}