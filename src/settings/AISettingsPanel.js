import { invoke } from '@tauri-apps/api/core';

export class AISettingsPanel {
    constructor() {
        this.state = {
            endpoint: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-4',
            temperature: 0.7,
            maxTokens: 2000,
            showApiKey: false,
            testing: false,
            testStatus: null,
            showAdvanced: false
        };
        
        this.container = null;
        this.callbacks = {
            onSave: null
        };
    }
    
    async mount(container, callbacks = {}) {
        console.log('Mounting AI Settings Panel');
        this.container = container;
        this.callbacks = { ...this.callbacks, ...callbacks };
        await this.loadSettings();
        this.render();
    }
    
    async loadSettings() {
        try {
            const settings = await invoke('get_ai_settings');
            if (settings) {
                console.log('Loaded AI settings:', { ...settings, api_key: '***' });
                // Convert snake_case to camelCase for frontend use
                this.state = { 
                    ...this.state, 
                    endpoint: settings.endpoint,
                    apiKey: settings.api_key,
                    model: settings.model,
                    temperature: settings.temperature,
                    maxTokens: settings.max_tokens
                };
            }
        } catch (error) {
            console.error('Failed to load AI settings:', error);
        }
    }
    
    async saveSettings() {
        try {
            const settings = {
                endpoint: this.state.endpoint,
                api_key: this.state.apiKey || null,
                model: this.state.model,
                temperature: this.state.temperature,
                max_tokens: this.state.maxTokens
            };
            
            console.log('Saving AI settings...');
            await invoke('save_ai_settings', { settings });
            
            this.showNotification('Settings saved successfully', 'success');
            
            // Call callback if provided
            if (this.callbacks.onSave) {
                this.callbacks.onSave(settings);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('Failed to save settings: ' + error, 'error');
        }
    }
    
    async testConnection() {
        this.state.testing = true;
        this.state.testStatus = null;
        this.render();
        
        try {
            const settings = {
                endpoint: this.state.endpoint,
                api_key: this.state.apiKey || null,
                model: this.state.model,
                temperature: this.state.temperature,
                max_tokens: this.state.maxTokens
            };
            
            console.log('Testing AI connection...');
            const result = await invoke('test_ai_connection', { settings });
            console.log('Connection test result:', result);
            
            this.state.testStatus = result;
        } catch (error) {
            console.error('Connection test failed:', error);
            this.state.testStatus = {
                overallStatus: {
                    success: false,
                    message: 'Test failed: ' + error
                }
            };
        } finally {
            this.state.testing = false;
            this.render();
        }
    }
    
    quickSetup(provider) {
        console.log('Quick setup for:', provider);
        
        switch (provider) {
            case 'openai':
                this.state.endpoint = 'https://api.openai.com/v1';
                this.state.model = 'gpt-4';
                this.state.apiKey = '';
                break;
            case 'ollama':
                this.state.endpoint = 'http://localhost:11434/v1';
                this.state.model = 'llama2';
                this.state.apiKey = '';
                break;
            case 'lmstudio':
                this.state.endpoint = 'http://localhost:1234/v1';
                this.state.model = 'TheBloke/Mistral-7B-Instruct-v0.2-GGUF';
                this.state.apiKey = '';
                break;
        }
        this.render();
    }
    
    updateEndpoint(value) {
        this.state.endpoint = value;
    }
    
    updateApiKey(value) {
        this.state.apiKey = value;
    }
    
    updateModel(value) {
        this.state.model = value;
    }
    
    updateTemperature(value) {
        this.state.temperature = parseFloat(value);
    }
    
    updateMaxTokens(value) {
        this.state.maxTokens = parseInt(value);
    }
    
    toggleApiKeyVisibility() {
        this.state.showApiKey = !this.state.showApiKey;
        this.render();
    }
    
    toggleAdvanced() {
        this.state.showAdvanced = !this.state.showAdvanced;
        this.render();
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    getModelExamples(endpoint) {
        if (endpoint.includes('openai.com')) {
            return 'Examples: gpt-4, gpt-3.5-turbo, gpt-4-turbo-preview';
        } else if (endpoint.includes('11434')) {
            return 'Examples: llama2, mistral, codellama';
        } else if (endpoint.includes('1234')) {
            return 'Examples: Use model name from LM Studio';
        }
        return 'Enter the model name for your AI provider';
    }
    
    render() {
        if (!this.container) return;
        
        // Make this instance available globally for event handlers
        window.aiSettingsPanel = this;
        
        this.container.innerHTML = `
            <div class="ai-settings-panel">
                <h2>AI Chat Settings</h2>
                
                <div class="quick-setup">
                    <p>Quick Setup:</p>
                    <div class="quick-setup-buttons">
                        <button onclick="aiSettingsPanel.quickSetup('openai')" class="quick-setup-btn">
                            <span class="provider-icon">🤖</span>
                            OpenAI
                        </button>
                        <button onclick="aiSettingsPanel.quickSetup('ollama')" class="quick-setup-btn">
                            <span class="provider-icon">🦙</span>
                            Ollama
                        </button>
                        <button onclick="aiSettingsPanel.quickSetup('lmstudio')" class="quick-setup-btn">
                            <span class="provider-icon">🖥️</span>
                            LM Studio
                        </button>
                    </div>
                </div>
                
                <div class="settings-form">
                    <div class="form-group">
                        <label>API Endpoint:</label>
                        <input 
                            type="url" 
                            value="${this.state.endpoint}"
                            onchange="aiSettingsPanel.updateEndpoint(this.value)"
                            placeholder="https://api.openai.com/v1"
                            class="form-input"
                        />
                        <small>The base URL for your AI provider's API</small>
                    </div>
                    
                    <div class="form-group">
                        <label>API Key:</label>
                        <div class="api-key-input">
                            <input 
                                type="${this.state.showApiKey ? 'text' : 'password'}" 
                                value="${this.state.apiKey}"
                                onchange="aiSettingsPanel.updateApiKey(this.value)"
                                placeholder="sk-..."
                                class="form-input"
                            />
                            <button onclick="aiSettingsPanel.toggleApiKeyVisibility()" class="toggle-visibility-btn">
                                ${this.state.showApiKey ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <small>Leave empty for local AI servers</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Model Name:</label>
                        <input 
                            type="text" 
                            value="${this.state.model}"
                            onchange="aiSettingsPanel.updateModel(this.value)"
                            placeholder="gpt-4"
                            class="form-input"
                        />
                        <small>${this.getModelExamples(this.state.endpoint)}</small>
                    </div>
                    
                    <div class="advanced-section">
                        <button onclick="aiSettingsPanel.toggleAdvanced()" class="advanced-toggle">
                            ${this.state.showAdvanced ? '▼' : '▶'} Advanced Settings
                        </button>
                        
                        ${this.state.showAdvanced ? `
                            <div class="advanced-settings">
                                <div class="form-group">
                                    <label>Temperature: ${this.state.temperature}</label>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="2" 
                                        step="0.1"
                                        value="${this.state.temperature}"
                                        oninput="aiSettingsPanel.updateTemperature(this.value); this.previousElementSibling.textContent = 'Temperature: ' + this.value"
                                        class="form-slider"
                                    />
                                    <small>Controls randomness: 0 = focused, 2 = creative</small>
                                </div>
                                
                                <div class="form-group">
                                    <label>Max Tokens:</label>
                                    <input 
                                        type="number" 
                                        min="100" 
                                        max="8000" 
                                        value="${this.state.maxTokens}"
                                        onchange="aiSettingsPanel.updateMaxTokens(this.value)"
                                        class="form-input"
                                    />
                                    <small>Maximum response length in tokens</small>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="form-actions">
                        <button 
                            onclick="aiSettingsPanel.testConnection()"
                            class="test-btn ${this.state.testing ? 'testing' : ''}"
                            ${this.state.testing ? 'disabled' : ''}
                        >
                            ${this.state.testing ? 'Testing...' : 'Test Connection'}
                        </button>
                        <button onclick="aiSettingsPanel.saveSettings()" class="save-btn">
                            Save Settings
                        </button>
                    </div>
                    
                    ${this.state.testStatus ? this.renderTestStatus() : ''}
                </div>
            </div>
        `;
    }
    
    renderTestStatus() {
        const status = this.state.testStatus;
        const overall = status.overall_status || status.overallStatus;
        
        if (!overall) return '';
        
        return `
            <div class="test-status ${overall.success ? 'success' : 'error'}">
                <div class="test-result">
                    <span class="status-icon">${overall.success ? '✓' : '✗'}</span>
                    <span class="status-message">${overall.message}</span>
                </div>
                
                ${status.endpoint_status ? `
                    <div class="test-detail">
                        <span class="detail-icon">${status.endpoint_status.success ? '✓' : '✗'}</span>
                        Endpoint: ${status.endpoint_status.message}
                    </div>
                ` : ''}
                
                ${status.auth_status ? `
                    <div class="test-detail">
                        <span class="detail-icon">${status.auth_status.success ? '✓' : '✗'}</span>
                        Authentication: ${status.auth_status.message}
                    </div>
                ` : ''}
                
                ${status.model_status ? `
                    <div class="test-detail">
                        <span class="detail-icon">${status.model_status.success ? '✓' : '✗'}</span>
                        Model: ${status.model_status.message}
                    </div>
                ` : ''}
            </div>
        `;
    }
}