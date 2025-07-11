// ChatPanel.js - Main chat container component
console.log('💬 ChatPanel loading...');

import { ChatInterface } from './ChatInterface.js';
import { ClaudeAuth } from './ClaudeAuth.js';
import { ContextManager } from './ContextManager.js';
import { ChatPersistence } from './ChatPersistence.js';
import { ClaudeSDK } from './ClaudeSDK.js';

export class ChatPanel {
  constructor() {
    console.log('🔧 Initializing ChatPanel');
    this.container = null;
    this.isAuthenticated = false;
    this.isVisible = false; // Start hidden
    this.width = 350; // Default width
    this.minWidth = 280;
    this.maxWidth = 600;
    
    // Components
    this.auth = null;
    this.interface = null;
    this.contextManager = null;
    this.persistence = null;
    this.claudeSDK = null;
    
    // Resize state
    this.isResizing = false;
    this.startX = 0;
    this.startWidth = 0;
  }
  
  mount(parentElement) {
    console.log('📌 Mounting ChatPanel to parent element');
    
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'chat-panel';
    this.container.style.width = `${this.width}px`;
    this.container.style.display = this.isVisible ? 'flex' : 'none';
    
    // Create resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'chat-resize-handle';
    resizeHandle.addEventListener('mousedown', this.startResize.bind(this));
    
    // Create content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'chat-content-wrapper';
    
    // Initialize components
    this.auth = new ClaudeAuth();
    this.interface = new ChatInterface();
    this.contextManager = new ContextManager();
    this.persistence = new ChatPersistence();
    this.claudeSDK = new ClaudeSDK();
    
    // Initialize SDK
    this.claudeSDK.initialize();
    
    // Set up authentication callback
    this.auth.onAuthStateChanged = (authenticated) => {
      console.log('🔐 Auth state changed:', authenticated);
      this.isAuthenticated = authenticated;
      this.updateUI();
    };
    
    // Set up message send callback
    this.interface.onSendMessage = async (message) => {
      console.log('📤 Sending message:', message);
      await this.handleSendMessage(message);
    };
    
    // Set up context change callback
    this.contextManager.onContextChanged = (context) => {
      console.log('📎 Context changed:', context);
      this.interface.updateContext(context);
    };
    
    // Build initial UI
    this.buildUI(contentWrapper);
    
    // Assemble container
    this.container.appendChild(resizeHandle);
    this.container.appendChild(contentWrapper);
    parentElement.appendChild(this.container);
    
    // Load saved width
    this.loadSavedWidth();
    
    // Check authentication status
    this.auth.checkAuthStatus();
    
    // Load chat history after UI is ready
    // Use setTimeout to ensure DOM is fully rendered
    setTimeout(() => {
      this.loadChatHistory();
    }, 100);
    
    console.log('✅ ChatPanel mounted successfully');
  }
  
  buildUI(wrapper) {
    // Clear wrapper
    wrapper.innerHTML = '';
    
    if (!this.isAuthenticated) {
      // Show auth UI
      console.log('🔓 Showing authentication UI');
      this.auth.mount(wrapper);
    } else {
      // Show chat UI
      console.log('💬 Showing chat interface');
      
      // Add header
      const header = this.createHeader();
      wrapper.appendChild(header);
      
      // Add chat interface
      const chatContainer = document.createElement('div');
      chatContainer.className = 'chat-interface-container';
      this.interface.mount(chatContainer);
      wrapper.appendChild(chatContainer);
      
      // Add context manager
      const contextContainer = document.createElement('div');
      contextContainer.className = 'chat-context-container';
      this.contextManager.mount(contextContainer);
      wrapper.appendChild(contextContainer);
    }
  }
  
  createHeader() {
    const header = document.createElement('div');
    header.className = 'chat-header';
    
    // Title and model
    const titleSection = document.createElement('div');
    titleSection.className = 'chat-title-section';
    
    const title = document.createElement('h3');
    title.className = 'chat-title';
    title.textContent = 'AI Chat';
    
    // Model selector
    const modelSelector = document.createElement('select');
    modelSelector.className = 'chat-model-selector';
    modelSelector.id = 'chat-model-selector';
    modelSelector.innerHTML = `
      <option value="default">Default (Opus/Sonnet)</option>
      <option value="opus">Opus 4</option>
      <option value="sonnet">Sonnet</option>
    `;
    modelSelector.onchange = (e) => this.handleModelChange(e.target.value);
    
    titleSection.appendChild(title);
    titleSection.appendChild(modelSelector);
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'chat-actions';
    
    // Clear chat button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'chat-action-btn';
    clearBtn.title = 'Clear chat';
    clearBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"/>
      </svg>
    `;
    clearBtn.onclick = () => this.clearChat();
    
    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'chat-action-btn';
    exportBtn.title = 'Export chat';
    exportBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
      </svg>
    `;
    exportBtn.onclick = () => this.exportChat();
    
    // Logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'chat-action-btn';
    logoutBtn.title = 'Logout';
    logoutBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
      </svg>
    `;
    logoutBtn.onclick = () => this.logout();
    
    actions.appendChild(clearBtn);
    actions.appendChild(exportBtn);
    actions.appendChild(logoutBtn);
    
    header.appendChild(titleSection);
    header.appendChild(actions);
    
    return header;
  }
  
  updateUI() {
    console.log('🔄 Updating ChatPanel UI');
    const wrapper = this.container.querySelector('.chat-content-wrapper');
    if (wrapper) {
      this.buildUI(wrapper);
    }
  }
  
  async handleSendMessage(message) {
    try {
      // Get current context with content
      const context = await this.contextManager.getContextWithContent();
      console.log('📎 Current context:', context);
      
      // Add user message to interface
      this.interface.addMessage({
        type: 'user',
        content: message,
        timestamp: new Date()
      });
      
      // Show typing indicator
      this.interface.showTyping();
      
      // Stream response from Claude CLI
      let fullResponse = '';
      let messageId = null;
      
      try {
        for await (const chunk of this.claudeSDK.sendMessage(message, context)) {
          if (chunk.type === 'content') {
            fullResponse = chunk.content;
            
            // Update or create message
            if (!messageId) {
              this.interface.hideTyping();
              messageId = Date.now();
              this.interface.addMessage({
                id: messageId,
                type: 'assistant',
                content: fullResponse,
                timestamp: new Date()
              });
            } else {
              // Update existing message
              this.interface.updateMessage(messageId, fullResponse);
            }
          } else if (chunk.type === 'error') {
            throw new Error(chunk.error);
          }
        }
        
        // Finalize the streaming message
        if (messageId) {
          this.interface.finalizeStreamingMessage(messageId);
        }
        
        // Save chat history after complete response
        this.saveChatHistory();
        
      } catch (streamError) {
        console.error('❌ Streaming error:', streamError);
        throw streamError;
      }
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      this.interface.hideTyping();
      this.interface.addMessage({
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      });
    }
  }
  
  clearChat() {
    console.log('🗑️ Clearing chat');
    if (confirm('Are you sure you want to clear the chat history?')) {
      this.interface.clearMessages();
      this.persistence.clearHistory();
    }
  }
  
  async exportChat() {
    console.log('📥 Exporting chat');
    try {
      const messages = this.interface.getMessages();
      const markdown = this.formatChatAsMarkdown(messages);
      
      // Use Tauri's invoke to save file
      const { invoke } = await import('@tauri-apps/api/core');
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `AI Chat - ${timestamp}.md`;
      
      // Create the file in the vault
      await invoke('create_new_file', { fileName: fileName });
      await invoke('write_file_content', { 
        filePath: fileName, 
        content: markdown 
      });
      
      console.log('✅ Chat exported successfully');
      
      // Show success notification
      this.showNotification('Chat exported successfully');
      
    } catch (error) {
      console.error('❌ Error exporting chat:', error);
      this.showNotification('Failed to export chat', 'error');
    }
  }
  
  formatChatAsMarkdown(messages) {
    let markdown = '# AI Chat Export\n\n';
    markdown += `**Date**: ${new Date().toLocaleString()}\n\n`;
    markdown += '---\n\n';
    
    messages.forEach(msg => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      if (msg.type === 'user') {
        markdown += `### You (${time})\n${msg.content}\n\n`;
      } else if (msg.type === 'assistant') {
        markdown += `### AI (${time})\n${msg.content}\n\n`;
      }
    });
    
    return markdown;
  }
  
  logout() {
    console.log('👋 Logging out');
    if (confirm('Are you sure you want to logout?')) {
      this.auth.logout();
    }
  }
  
  async handleModelChange(model) {
    console.log('🔄 Changing model to:', model);
    
    if (this.claudeSDK) {
      try {
        await this.claudeSDK.switchModel(model);
        this.showNotification(`Switched to ${model} model`);
      } catch (error) {
        console.error('❌ Error switching model:', error);
        this.showNotification('Failed to switch model', 'error');
        
        // Reset selector
        const selector = document.getElementById('chat-model-selector');
        if (selector) {
          selector.value = this.claudeSDK.currentModel || 'default';
        }
      }
    }
  }
  
  loadChatHistory() {
    console.log('📚 Loading chat history');
    const history = this.persistence.loadHistory();
    if (history && history.messages) {
      history.messages.forEach(msg => {
        this.interface.addMessage(msg);
      });
    }
  }
  
  saveChatHistory() {
    console.log('💾 Saving chat history');
    const messages = this.interface.getMessages();
    this.persistence.saveHistory({ messages });
  }
  
  // Resize functionality
  startResize(e) {
    console.log('🔄 Starting resize');
    this.isResizing = true;
    this.startX = e.clientX;
    this.startWidth = this.width;
    
    document.addEventListener('mousemove', this.doResize);
    document.addEventListener('mouseup', this.stopResize);
    
    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  }
  
  doResize = (e) => {
    if (!this.isResizing) return;
    
    const diff = this.startX - e.clientX;
    const newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, this.startWidth + diff));
    
    this.width = newWidth;
    this.container.style.width = `${newWidth}px`;
  }
  
  stopResize = () => {
    console.log('✋ Stopping resize');
    this.isResizing = false;
    
    document.removeEventListener('mousemove', this.doResize);
    document.removeEventListener('mouseup', this.stopResize);
    
    // Restore text selection
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    
    // Save width preference
    this.saveWidth();
  }
  
  saveWidth() {
    localStorage.setItem('aura-chat-width', this.width.toString());
  }
  
  loadSavedWidth() {
    const saved = localStorage.getItem('aura-chat-width');
    if (saved) {
      this.width = parseInt(saved);
      this.container.style.width = `${this.width}px`;
    }
  }
  
  showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `chat-notification ${type}`;
    notification.textContent = message;
    
    // Add to container
    this.container.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  toggle() {
    console.log('👁️ Toggling chat panel visibility');
    console.log('Current visibility:', this.isVisible);
    console.log('Container exists:', !!this.container);
    
    if (!this.container) {
      console.error('❌ Chat panel container not found');
      return;
    }
    
    this.isVisible = !this.isVisible;
    this.container.style.display = this.isVisible ? 'flex' : 'none';
    
    console.log('New visibility:', this.isVisible);
    console.log('Container display:', this.container.style.display);
  }
  
  show() {
    this.isVisible = true;
    this.container.style.display = 'flex';
  }
  
  hide() {
    this.isVisible = false;
    this.container.style.display = 'none';
  }
}