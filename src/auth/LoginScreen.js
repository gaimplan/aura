// LoginScreen.js - Aura authentication interface
console.log('🔐 Loading LoginScreen module...');

export class LoginScreen {
  constructor() {
    console.log('📋 Initializing LoginScreen');
    this.container = null;
    this.callbacks = {};
    this.rememberMe = false;
  }

  mount(container) {
    console.log('🏗️ Mounting LoginScreen to container');
    this.container = container;
    this.render();
  }

  render() {
    console.log('🎨 Rendering login screen');
    
    this.container.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <div class="login-header">
            <h1>Welcome to Aura</h1>
            <p>Sign in to access your vaults</p>
          </div>
          
          <form class="login-form" id="login-form">
            <div class="form-group">
              <label for="username">Username</label>
              <input 
                type="text" 
                id="username" 
                name="username" 
                class="form-input" 
                placeholder="Enter your username"
                required 
                autocomplete="username"
              />
            </div>
            
            <div class="form-group">
              <label for="password">Password</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                class="form-input" 
                placeholder="Enter your password"
                required 
                autocomplete="current-password"
              />
            </div>
            
            <div class="form-options">
              <label class="checkbox-label">
                <input type="checkbox" id="remember-me" />
                <span>Remember me</span>
              </label>
            </div>
            
            <button type="submit" class="login-button">
              Sign In
            </button>
            
            <div class="login-error" id="login-error" style="display: none;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span id="error-message">Invalid credentials</span>
            </div>
          </form>
          
          <div class="login-footer">
            <button class="link-button" onclick="window.loginScreen?.showGuestMode()">
              Continue without signing in
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach event listeners
    this.attachEventListeners();
  }

  attachEventListeners() {
    console.log('🔗 Attaching login event listeners');
    
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleLogin(e));
    }

    const rememberCheckbox = document.getElementById('remember-me');
    if (rememberCheckbox) {
      rememberCheckbox.addEventListener('change', (e) => {
        this.rememberMe = e.target.checked;
        console.log(`📝 Remember me: ${this.rememberMe}`);
      });
    }
  }

  async handleLogin(event) {
    event.preventDefault();
    console.log('🔑 Handling login attempt');
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Hide any previous errors
    this.hideError();
    
    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Signing in...';
    submitButton.disabled = true;
    
    try {
      // Call the login callback if provided
      if (this.callbacks.onLogin) {
        console.log('🚀 Calling login callback');
        const result = await this.callbacks.onLogin({
          username,
          password,
          rememberMe: this.rememberMe
        });
        
        if (result.success) {
          console.log('✅ Login successful');
          // Store session if remember me is checked
          if (this.rememberMe && result.token) {
            this.storeSession(result.token, username);
          }
          
          // Call success callback
          if (this.callbacks.onSuccess) {
            this.callbacks.onSuccess(result);
          }
        } else {
          console.log('❌ Login failed');
          this.showError(result.message || 'Invalid username or password');
        }
      } else {
        console.warn('⚠️ No login callback provided');
        this.showError('Login system not configured');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      this.showError('An error occurred during login');
    } finally {
      // Reset button state
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  }

  showError(message) {
    console.log(`🚨 Showing error: ${message}`);
    const errorDiv = document.getElementById('login-error');
    const errorMessage = document.getElementById('error-message');
    
    if (errorDiv && errorMessage) {
      errorMessage.textContent = message;
      errorDiv.style.display = 'flex';
    }
  }

  hideError() {
    console.log('🔕 Hiding error message');
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  showGuestMode() {
    console.log('👤 Entering guest mode');
    if (this.callbacks.onGuestMode) {
      this.callbacks.onGuestMode();
    }
  }

  storeSession(token, username) {
    console.log('💾 Storing session data');
    const sessionData = {
      token,
      username,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem('aura-session', JSON.stringify(sessionData));
      console.log('✅ Session stored successfully');
    } catch (error) {
      console.error('❌ Failed to store session:', error);
    }
  }

  loadStoredSession() {
    console.log('📂 Loading stored session');
    try {
      const sessionData = localStorage.getItem('aura-session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        console.log('✅ Found stored session');
        return session;
      }
    } catch (error) {
      console.error('❌ Failed to load session:', error);
    }
    return null;
  }

  clearSession() {
    console.log('🗑️ Clearing session data');
    try {
      localStorage.removeItem('aura-session');
      console.log('✅ Session cleared');
    } catch (error) {
      console.error('❌ Failed to clear session:', error);
    }
  }

  // Event callbacks
  on(event, callback) {
    console.log(`📎 Registering callback for event: ${event}`);
    this.callbacks[event] = callback;
  }
}

// Create global instance
window.loginScreen = new LoginScreen();
console.log('✅ LoginScreen module loaded successfully');