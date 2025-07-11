// ClaudeWebView.js - WebView integration for Claude.ai
console.log('🌐 ClaudeWebView loading...');

import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit, listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

export class ClaudeWebView {
  constructor() {
    console.log('🔧 Initializing ClaudeWebView');
    this.webview = null;
    this.isReady = false;
    this.onMessageReceived = null;
    this.contextQueue = [];
  }
  
  async initialize() {
    console.log('🚀 Creating Claude WebView window...');
    
    try {
      // Create webview window properly
      const webview = new WebviewWindow('claude-chat', {
        url: 'https://claude.ai/new',
        title: 'Claude Chat',
        width: 800,
        height: 600,
        resizable: true,
        center: true
      });
      
      // Store reference
      this.webview = webview;
      
      // Wait a bit for window to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.isReady = true;
      console.log('✅ ClaudeWebView initialized');
      
      // Setup listeners
      this.setupEventListeners();
      
      // Inject scripts after a delay
      setTimeout(() => {
        this.injectHelperScripts();
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to create Claude webview:', error);
      throw error;
    }
  }
  
  setupEventListeners() {
    try {
      // Listen for window close
      if (this.webview.onCloseRequested) {
        this.webview.onCloseRequested(() => {
          console.log('🔍 Claude webview close requested');
          // Don't actually close, just hide
          if (this.webview.hide) {
            this.webview.hide();
          }
        });
      }
      
      // Listen for messages from injected scripts
      listen('claude-message', (event) => {
        console.log('📨 Received message from Claude:', event.payload);
        if (this.onMessageReceived) {
          this.onMessageReceived(event.payload);
        }
      });
    } catch (error) {
      console.error('❌ Error setting up event listeners:', error);
    }
  }
  
  async injectHelperScripts() {
    console.log('💉 Injecting helper scripts into Claude...');
    
    const script = `
      console.log('🔧 Aura helper script injected into Claude.ai');
      
      // Create Aura integration namespace
      window.AuraIntegration = {
        // Function to inject context into the chat
        injectContext: function(context) {
          console.log('📝 Injecting context:', context);
          
          // Find the input textarea
          const textarea = document.querySelector('div[contenteditable="true"]');
          if (!textarea) {
            console.error('❌ Could not find Claude input field');
            return false;
          }
          
          // Create context header
          const contextText = \`---\\nContext from Aura notes:\\n\\n\${context}\\n---\\n\\n\`;
          
          // Insert at beginning of input
          const currentText = textarea.innerText || '';
          textarea.innerText = contextText + currentText;
          
          // Trigger input event
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Focus the textarea
          textarea.focus();
          
          return true;
        },
        
        // Function to monitor for new messages
        observeMessages: function() {
          console.log('👀 Starting to observe Claude messages...');
          
          // Find the messages container
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              mutation.addedNodes.forEach((node) => {
                // Check if this is a message from Claude
                if (node.nodeType === 1 && node.querySelector && 
                    (node.classList.contains('font-claude-message') || 
                     node.querySelector('[data-is-streaming]'))) {
                  
                  // Extract message content
                  const messageEl = node.querySelector('[data-is-streaming]') || node;
                  const content = messageEl.innerText || messageEl.textContent;
                  
                  if (content && content.trim()) {
                    console.log('🤖 Claude message detected:', content.substring(0, 100) + '...');
                    
                    // Send to Aura
                    window.__TAURI_INVOKE__('tauri', {
                      __tauriModule: 'Event',
                      message: {
                        cmd: 'emit',
                        event: 'claude-message',
                        payload: {
                          type: 'assistant',
                          content: content,
                          timestamp: new Date().toISOString()
                        }
                      }
                    });
                  }
                }
              });
            });
          });
          
          // Start observing the entire document for changes
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        },
        
        // Add visual indicator
        addAuraIndicator: function() {
          const indicator = document.createElement('div');
          indicator.id = 'aura-indicator';
          indicator.innerHTML = '🔗 Connected to Aura';
          indicator.style.cssText = \`
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #4572DE;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          \`;
          document.body.appendChild(indicator);
          
          // Hide after 3 seconds
          setTimeout(() => {
            indicator.style.opacity = '0';
            indicator.style.transition = 'opacity 0.3s';
            setTimeout(() => indicator.remove(), 300);
          }, 3000);
        }
      };
      
      // Initialize
      window.AuraIntegration.addAuraIndicator();
      window.AuraIntegration.observeMessages();
      
      // Process any queued context
      if (window.__AURA_CONTEXT_QUEUE__ && window.__AURA_CONTEXT_QUEUE__.length > 0) {
        console.log('📋 Processing queued context...');
        window.__AURA_CONTEXT_QUEUE__.forEach(context => {
          window.AuraIntegration.injectContext(context);
        });
        window.__AURA_CONTEXT_QUEUE__ = [];
      }
    `;
    
    try {
      await this.webview.eval(script);
      console.log('✅ Helper scripts injected successfully');
    } catch (error) {
      console.error('❌ Failed to inject helper scripts:', error);
    }
  }
  
  async injectContext(context) {
    console.log('📎 Opening Claude with context:', context.substring(0, 100) + '...');
    
    if (!this.isReady) {
      console.log('⏳ Not ready, initializing...');
      await this.initialize();
    }
    
    try {
      // Since we can't inject into an external browser, 
      // we'll copy the context to clipboard and open Claude
      
      // First, copy the context to clipboard
      await navigator.clipboard.writeText(context);
      console.log('📋 Context copied to clipboard');
      
      // Open Claude.ai in browser
      await open('https://claude.ai/new');
      console.log('🌐 Opened Claude.ai in browser');
      
      // Show a notification to the user
      if (this.onMessageReceived) {
        this.onMessageReceived({
          type: 'assistant',
          content: 'I\'ve opened Claude.ai in your browser and copied your message to the clipboard. Please paste it (Cmd+V) in the Claude chat to continue.',
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to open Claude:', error);
      
      // Fallback - just show the context for manual copy
      if (this.onMessageReceived) {
        this.onMessageReceived({
          type: 'error',
          content: `Failed to open Claude.ai. Please open it manually and paste this message:\n\n${context}`,
          timestamp: new Date()
        });
      }
    }
  }
  
  async show() {
    // In browser mode, we just open Claude.ai
    if (this.useBrowserMode) {
      try {
        await open('https://claude.ai');
        console.log('🌐 Opened Claude.ai in browser');
      } catch (error) {
        console.error('❌ Error opening Claude:', error);
      }
    }
  }
  
  async hide() {
    if (this.webview) {
      try {
        if (this.webview.window && this.webview.window.hide) {
          await this.webview.window.hide();
        } else if (this.webview.hide) {
          await this.webview.hide();
        }
      } catch (error) {
        console.error('❌ Error hiding webview:', error);
      }
    }
  }
  
  async close() {
    if (this.webview) {
      await this.webview.close();
      this.webview = null;
      this.isReady = false;
    }
  }
}