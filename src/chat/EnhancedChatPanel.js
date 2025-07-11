// EnhancedChatPanel.js - Enhanced chat panel with multi-provider AI support
console.log('💬 Enhanced ChatPanel loading...');

import { ChatInterface } from './ChatInterface.js';
import { ClaudeAuth } from './ClaudeAuth.js';
import { ContextManager } from './ContextManager.js';
import { ChatPersistence } from './ChatPersistence.js';
import { ClaudeSDK } from './ClaudeSDK.js';
import { OpenAISDK } from './OpenAISDK.js';
import { AISettingsPanel } from '../settings/AISettingsPanel.js';

export class EnhancedChatPanel {
    constructor() {
        console.log('🔧 Initializing Enhanced ChatPanel');
        this.container = null;
        this.isAuthenticated = false;
        // Initialize visibility from saved state to prevent state mismatch
        this.isVisible = localStorage.getItem('aura-chat-visible') === 'true';
        this.width = 350;
        this.minWidth = 280;
        this.maxWidth = 600;
        
        // AI Provider Management
        this.currentProvider = 'openai'; // Always use OpenAI
        this.providers = {
            openai: {
                name: 'OpenAI/Custom',
                sdk: null,
                configured: false,
                status: 'unknown'
            }
        };
        
        // Components
        this.auth = null;
        this.interface = null;
        this.contextManager = null;
        this.persistence = null;
        this.settingsPanel = null;
        this.showingSettings = false;
        
        // Resize state
        this.isResizing = false;
        this.startX = 0;
        this.startWidth = 0;
    }
    
    async mount(parentElement) {
        console.log('📌 Mounting Enhanced ChatPanel');
        
        // Create main container (fills the right sidebar)
        this.container = document.createElement('div');
        this.container.className = 'chat-panel enhanced right-sidebar-panel';
        this.container.style.height = '100%';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        
        // Create content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'chat-content-wrapper';
        
        // Initialize components
        this.auth = new ClaudeAuth();
        this.interface = new ChatInterface();
        this.contextManager = new ContextManager();
        this.persistence = new ChatPersistence();
        this.settingsPanel = new AISettingsPanel();
        
        // Initialize SDK
        this.providers.openai.sdk = new OpenAISDK();
        
        await this.initializeProviders();
        
        // Set up authentication callback
        this.auth.onAuthStateChanged = (authenticated) => {
            console.log('🔐 Auth state changed:', authenticated);
            this.isAuthenticated = authenticated;
            this.updateUI();
        };
        
        // Set up message send callback
        this.interface.onSendMessage = async (message) => {
            console.log('📤 Sending message via', this.currentProvider);
            await this.handleSendMessage(message);
        };
        
        // Set up context change callback
        this.contextManager.onContextChanged = (context) => {
            console.log('📎 Context changed:', context);
            this.interface.updateContext(context);
        };
        
        // Build initial UI
        this.buildUI(contentWrapper);
        
        // Assemble container (no resize handle for right sidebar)
        this.container.appendChild(contentWrapper);
        parentElement.appendChild(this.container);
        
        // Load saved settings
        this.loadSavedProvider();
        
        // Check authentication status
        this.auth.checkAuthStatus();
        
        // Load chat history
        setTimeout(() => {
            this.loadChatHistory();
        }, 100);
        
        console.log('✅ Enhanced ChatPanel mounted successfully');
    }
    
    async initializeProviders() {
        console.log('🚀 Initializing AI providers...');
        
        try {
            // Initialize OpenAI SDK
            const initialized = await this.providers.openai.sdk.initialize();
            this.providers.openai.configured = initialized;
            this.providers.openai.status = initialized ? 'ready' : 'not-configured';
        } catch (error) {
            console.warn('OpenAI SDK initialization failed:', error);
            this.providers.openai.configured = false;
            this.providers.openai.status = 'error';
        }
        
        // Always use OpenAI/Custom
        this.currentProvider = 'openai';
        
        console.log('Providers initialized:', {
            openai: this.providers.openai.status,
            current: this.currentProvider
        });
    }
    
    buildUI(wrapper) {
        wrapper.innerHTML = '';
        
        if (this.showingSettings) {
            this.buildSettingsUI(wrapper);
        } else {
            console.log('💬 Showing enhanced chat interface');
            this.buildChatUI(wrapper);
        }
    }
    
    buildChatUI(wrapper) {
        // Add header
        const header = this.createEnhancedHeader();
        wrapper.appendChild(header);
        
        // Check if current provider is configured
        const provider = this.providers[this.currentProvider];
        
        if (!provider.configured) {
            // Show configuration prompt
            const configPrompt = this.createConfigPrompt();
            wrapper.appendChild(configPrompt);
        } else {
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
    
    buildSettingsUI(wrapper) {
        const settingsContainer = document.createElement('div');
        settingsContainer.className = 'settings-container';
        
        // Add back button
        const backButton = document.createElement('button');
        backButton.className = 'back-button';
        backButton.innerHTML = '← Back to Chat';
        backButton.onclick = () => this.hideSettings();
        
        settingsContainer.appendChild(backButton);
        
        // Create scrollable content area
        const scrollableContent = document.createElement('div');
        scrollableContent.className = 'settings-scrollable-content';
        scrollableContent.style.flex = '1';
        scrollableContent.style.overflow = 'hidden';
        
        // Mount settings panel
        this.settingsPanel.mount(scrollableContent, {
            onSave: async (settings) => {
                console.log('Settings saved, refreshing providers...');
                await this.refreshProviders();
                // Auto-switch to OpenAI if it becomes configured
                if (this.providers.openai.configured) {
                    this.currentProvider = 'openai';
                }
                this.hideSettings();
            }
        });
        
        settingsContainer.appendChild(scrollableContent);
        wrapper.appendChild(settingsContainer);
    }
    
    createEnhancedHeader() {
        const header = document.createElement('div');
        header.className = 'chat-header simple';
        
        // Left side - title and model selector
        const leftSection = document.createElement('div');
        leftSection.className = 'chat-header-left';
        
        const title = document.createElement('h3');
        title.className = 'chat-title';
        title.textContent = 'Chat';
        
        // Status indicator (moved to left side, after title)
        const statusDot = document.createElement('span');
        statusDot.className = 'status-dot';
        const isConnected = this.providers[this.currentProvider].configured;
        statusDot.classList.add(isConnected ? 'connected' : 'disconnected');
        statusDot.title = isConnected ? 'AI online' : 'AI offline';
        
        leftSection.appendChild(title);
        leftSection.appendChild(statusDot);
        
        // Minimal actions
        const actions = document.createElement('div');
        actions.className = 'chat-actions';
        
        // Export/Download button
        const exportBtn = document.createElement('button');
        exportBtn.className = 'chat-action-btn minimal';
        exportBtn.title = 'Export chat';
        exportBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
        `;
        exportBtn.onclick = () => this.exportChat();
        
        // New Chat button (more prominent - 20% larger)
        const newChatBtn = document.createElement('button');
        newChatBtn.className = 'chat-action-btn minimal new-chat-btn';
        newChatBtn.title = 'New Chat';
        newChatBtn.innerHTML = `
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        `;
        newChatBtn.onclick = () => this.clearChat();
        
        // Settings button (gear icon)
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'chat-action-btn minimal';
        settingsBtn.title = 'Settings';
        settingsBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
            </svg>
        `;
        settingsBtn.onclick = () => this.showSettings();
        
        actions.appendChild(newChatBtn);
        actions.appendChild(exportBtn);
        actions.appendChild(settingsBtn);
        
        header.appendChild(leftSection);
        header.appendChild(actions);
        
        return header;
    }
    
    createConfigPrompt() {
        const prompt = document.createElement('div');
        prompt.className = 'config-prompt simple';
        
        prompt.innerHTML = `
            <div class="config-content">
                <div class="config-icon">🤖</div>
                <h3>Set up AI chat</h3>
                <p>Connect your AI provider to start chatting</p>
                <button onclick="window.enhancedChatPanel.showSettings()" class="config-button">
                    Configure
                </button>
            </div>
        `;
        
        return prompt;
    }
    
    buildProviderOptions() {
        // Only show OpenAI/Custom option, not Claude
        return `<option value="openai">OpenAI/Custom</option>`;
    }
    
    getProviderStatusIcon() {
        const provider = this.providers[this.currentProvider];
        
        switch (provider.status) {
            case 'ready':
                return '🟢';
            case 'not-configured':
                return '⚫';
            case 'error':
                return '🔴';
            default:
                return '🟡';
        }
    }
    
    async switchProvider(providerKey) {
        console.log('🔄 Switching to provider:', providerKey);
        
        this.currentProvider = providerKey;
        
        // Update UI
        this.updateUI();
        
        // Save preference
        localStorage.setItem('aura-chat-provider', providerKey);
    }
    
    async refreshProviders() {
        console.log('🔄 Refreshing providers...');
        await this.initializeProviders();
        this.updateUI();
    }
    
    showSettings() {
        console.log('⚙️ Showing settings');
        this.showingSettings = true;
        this.updateUI();
    }
    
    hideSettings() {
        console.log('⚙️ Hiding settings');
        this.showingSettings = false;
        this.updateUI();
    }
    
    async handleSendMessage(message) {
        try {
            const provider = this.providers[this.currentProvider];
            
            console.log('Current provider:', this.currentProvider, provider);
            
            if (!provider.configured) {
                this.interface.addMessage({
                    type: 'error',
                    content: `${provider.name} is not configured. Please check your settings.`,
                    timestamp: new Date()
                });
                return;
            }
            
            if (!provider.sdk) {
                this.interface.addMessage({
                    type: 'error',
                    content: `${provider.name} SDK is not initialized. Please refresh the page.`,
                    timestamp: new Date()
                });
                return;
            }
            
            // Get context from ChatInterface (what's shown in the pills)
            const allContext = await this.getAllContext();
            console.log('All context from pills:', allContext);
            
            // Add context message to show which files were included
            if (allContext.length > 0) {
                const contextFileNames = allContext.map(ctx => ctx.title).join(', ');
                this.interface.addMessage({
                    type: 'context',
                    content: `Context: ${contextFileNames}`,
                    timestamp: new Date()
                });
            }
            
            // Add user message to UI
            this.interface.addMessage({
                type: 'user',
                content: message,
                timestamp: new Date()
            });
            
            // Show typing indicator
            this.interface.showTyping();
            
            let response = '';
            
            if (this.currentProvider === 'claude') {
                // Use Claude SDK
                response = await provider.sdk.sendMessage(message, allContext);
                this.interface.hideTyping();
                this.interface.addMessage({
                    type: 'assistant',
                    content: response,
                    timestamp: new Date()
                });
            } else if (this.currentProvider === 'openai') {
                // Use OpenAI SDK
                // Get conversation history for context (excluding errors and context messages)
                const conversationHistory = this.interface.getMessages() || [];
                const formattedHistory = conversationHistory
                    .filter(msg => msg.type !== 'error' && msg.type !== 'context') // Exclude error and context messages
                    .map(msg => ({
                        role: msg.type === 'user' ? 'user' : 'assistant',
                        content: msg.content
                    }));
                
                // Format messages with history
                const messages = provider.sdk.formatMessages(message, allContext);
                
                // Add conversation history before the current message (but after system messages)
                const systemMessages = messages.filter(m => m.role === 'system');
                const currentUserMessage = messages.find(m => m.role === 'user');
                
                // Only include history messages that aren't the current message
                const historyWithoutCurrent = formattedHistory.filter(
                    msg => !(msg.role === 'user' && msg.content === message)
                );
                
                const fullMessages = [
                    ...systemMessages,
                    ...historyWithoutCurrent.slice(-10), // Include last 10 messages for context
                    currentUserMessage
                ].filter(Boolean);
                
                console.log('Sending messages to OpenAI:', fullMessages);
                console.log('Messages array length:', fullMessages.length);
                
                if (!fullMessages || fullMessages.length === 0) {
                    throw new Error('No messages to send');
                }
                
                try {
                    response = await provider.sdk.sendChat(fullMessages);
                    this.interface.hideTyping();
                    this.interface.addMessage({
                        type: 'assistant',
                        content: response,
                        timestamp: new Date()
                    });
                } catch (chatError) {
                    console.error('Chat error:', chatError);
                    this.interface.hideTyping();
                    throw chatError;
                }
            }
            
            // Save conversation
            this.saveConversation();
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.interface.hideTyping();
            this.interface.addMessage({
                type: 'error',
                content: `Error: ${error.message}`,
                timestamp: new Date()
            });
        }
    }
    
    async getAllContext() {
        // Get all context from the ChatInterface (what's shown in the pills)
        const contextNotes = [];
        
        // Get active note
        const activeNote = await this.getActiveNoteContent();
        if (activeNote) {
            contextNotes.push(activeNote);
        }
        
        // Get mentioned notes from currentContext
        const mentionedNotes = this.interface.currentContext || [];
        for (const note of mentionedNotes) {
            const content = await this.getNoteContent(note.path);
            if (content) {
                contextNotes.push({
                    title: note.title || note.name,
                    content: content,
                    path: note.path
                });
            }
        }
        
        return contextNotes;
    }
    
    async getActiveNoteContent() {
        // Get current note content from CodeMirror
        console.log('Getting active note content...');
        
        if (window.paneManager) {
            const activeTabManager = window.paneManager.getActiveTabManager();
            const activeTab = activeTabManager?.getActiveTab();
            
            if (activeTab && activeTab.editor) {
                // activeTab.editor is a MarkdownEditor instance, get the CodeMirror view
                const content = activeTab.editor.view ? 
                    activeTab.editor.view.state.doc.toString() : 
                    activeTab.editor.state.doc.toString();
                const title = activeTab.title || 'Current Note';
                console.log('Got content from:', title, 'Length:', content.length);
                
                // Truncate if too long
                const maxLength = 8000;
                const truncatedContent = content.length > maxLength 
                    ? content.substring(0, maxLength) + '...[truncated]'
                    : content;
                
                return {
                    title: title,
                    content: truncatedContent,
                    path: activeTab.filePath
                };
            }
        }
        return null;
    }
    
    async getNoteContent(path) {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const content = await invoke('read_file_content', {
                filePath: path
            });
            
            // Truncate if too long
            const maxLength = 8000;
            return content.length > maxLength 
                ? content.substring(0, maxLength) + '...[truncated]'
                : content;
        } catch (error) {
            console.error('Error reading note content:', error);
            return null;
        }
    }
    
    
    showAddToNoteButton(messageId, content) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'message-actions';
            buttonContainer.innerHTML = `
                <button onclick="window.enhancedChatPanel.addToActiveNote('${messageId}')">
                    Add to Note
                </button>
            `;
            messageEl.appendChild(buttonContainer);
        }
    }
    
    async addToActiveNote(messageId) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        const content = messageEl.querySelector('.message-content').textContent;
        
        if (window.paneManager) {
            const activeTab = window.paneManager.getActiveTabManager()?.getActiveTab();
            if (activeTab && activeTab.editor) {
                const view = activeTab.editor;
                const state = view.state;
                const cursorPos = state.selection.main.head;
                
                const transaction = state.update({
                    changes: {
                        from: cursorPos,
                        to: cursorPos,
                        insert: `\n\n${content}\n\n`
                    }
                });
                
                view.dispatch(transaction);
                this.showNotification('Added to note');
            } else {
                this.showNotification('No active note to add to', 'error');
            }
        }
    }
    
    showNotification(message, type = 'success') {
        console.log(`📢 ${type}: ${message}`);
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `chat-notification ${type}`;
        notification.textContent = message;
        
        // Add to container
        if (this.container) {
            this.container.appendChild(notification);
            
            // Remove after 3 seconds
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    }
    
    updateUI() {
        if (!this.container) return;
        
        const wrapper = this.container.querySelector('.chat-content-wrapper');
        if (wrapper) {
            this.buildUI(wrapper);
        }
        
        // Make this instance globally available
        window.enhancedChatPanel = this;
    }
    
    // Toggle right sidebar visibility
    toggle() {
        this.isVisible = !this.isVisible;
        const rightSidebar = document.getElementById('right-sidebar');
        const chatToggleBtn = document.getElementById('chat-toggle-btn');
        
        if (rightSidebar) {
            if (this.isVisible) {
                rightSidebar.classList.add('visible');
                // Apply saved width if available
                const savedWidth = localStorage.getItem('chatPanelWidth');
                if (savedWidth) {
                    rightSidebar.style.width = savedWidth + 'px';
                }
            } else {
                rightSidebar.classList.remove('visible');
                // Remove inline width style to ensure CSS takes over
                rightSidebar.style.width = '';
            }
        }
        
        // Update button active state
        if (chatToggleBtn) {
            if (this.isVisible) {
                chatToggleBtn.classList.add('active');
            } else {
                chatToggleBtn.classList.remove('active');
            }
        }
        
        // Save visibility state
        localStorage.setItem('aura-chat-visible', this.isVisible.toString());
        
        console.log('💬 Chat panel toggled:', this.isVisible ? 'visible' : 'hidden');
    }
    
    loadSavedProvider() {
        // Always use OpenAI, ignore any saved Claude preference
        this.currentProvider = 'openai';
        localStorage.setItem('aura-chat-provider', 'openai');
        
        // Load saved visibility state
        const savedVisibility = localStorage.getItem('aura-chat-visible');
        if (savedVisibility === 'true') {
            this.isVisible = true;
            const rightSidebar = document.getElementById('right-sidebar');
            const chatToggleBtn = document.getElementById('chat-toggle-btn');
            
            if (rightSidebar) {
                rightSidebar.classList.add('visible');
            }
            if (chatToggleBtn) {
                chatToggleBtn.classList.add('active');
            }
        }
    }
    
    clearChat() {
        this.interface.clearMessages();
        this.persistence.clearHistory();
    }
    
    async exportChat() {
        console.log('💾 Exporting chat...');
        
        try {
            // Get all messages
            const messages = this.interface.getMessages();
            if (!messages || messages.length === 0) {
                alert('No messages to export');
                return;
            }
            
            // Format chat as markdown with context information
            let markdown = '# Chat Export\n\n';
            markdown += `**Date**: ${new Date().toLocaleString()}\n`;
            markdown += `**Provider**: ${this.providers[this.currentProvider].name}\n`;
            markdown += `**Messages**: ${messages.length}\n\n`;
            
            // Add context information if available
            const contextIndicator = document.getElementById('chat-context-indicator');
            const contextPills = contextIndicator?.querySelectorAll('.context-pill');
            if (contextPills && contextPills.length > 0) {
                markdown += '## Context Used\n\n';
                contextPills.forEach(pill => {
                    const noteName = pill.querySelector('span')?.textContent || 'Unknown';
                    const isActive = pill.classList.contains('active-note');
                    markdown += `- ${noteName}${isActive ? ' (Active Note)' : ''}\n`;
                });
                markdown += '\n';
            }
            
            markdown += '## Conversation\n\n';
            
            messages.forEach((msg, index) => {
                const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
                
                if (msg.type === 'user') {
                    markdown += `### You - ${timestamp}\n${msg.content}\n\n`;
                } else if (msg.type === 'assistant') {
                    markdown += `### AI - ${timestamp}\n${msg.content}\n\n`;
                } else if (msg.type === 'error') {
                    markdown += `### Error - ${timestamp}\n${msg.content}\n\n`;
                } else if (msg.type === 'context') {
                    markdown += `*${msg.content}*\n\n`;
                }
            });
            
            // Export to vault's Chat History folder
            const { invoke } = await import('@tauri-apps/api/core');
            
            const filePath = await invoke('export_chat_to_vault', {
                content: markdown,
                filename: null // Let the backend generate timestamp-based filename
            });
            
            console.log('✅ Chat exported successfully to:', filePath);
            this.showNotification('Chat exported to Chat History folder');
            
            // Refresh the file tree to show the new file
            // This will trigger the file tree update if it's listening for changes
            window.dispatchEvent(new CustomEvent('vault-files-changed'));
            
            // Also try direct refresh as a fallback
            if (window.refreshFileTree) {
                console.log('📁 Directly refreshing file tree...');
                window.refreshFileTree();
            }
            
        } catch (error) {
            console.error('Error exporting chat:', error);
            this.showNotification('Failed to export chat', 'error');
        }
    }
    
    saveConversation() {
        // Save current conversation
        const messages = this.interface.getMessages();
        this.persistence.saveHistory(messages);
    }
    
    loadChatHistory() {
        const history = this.persistence.loadHistory();
        if (history && history.length > 0) {
            this.interface.loadMessages(history);
        }
    }
}