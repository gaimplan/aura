// AuthManager.js - Handles authentication logic and user management
console.log('🔐 Loading AuthManager module...');

import { invoke } from '@tauri-apps/api/core';

export class AuthManager {
  constructor() {
    console.log('📋 Initializing AuthManager');
    this.currentUser = null;
    this.isAuthenticated = false;
    this.vaultPermissions = new Map(); // Maps vault paths to access levels
  }

  async initialize() {
    console.log('🚀 Initializing authentication system');
    
    try {
      // Check for stored session
      const session = this.loadStoredSession();
      if (session) {
        console.log('📂 Found stored session, validating...');
        const isValid = await this.validateSession(session);
        if (isValid) {
          this.currentUser = { username: session.username };
          this.isAuthenticated = true;
          console.log('✅ Session validated successfully');
          return true;
        } else {
          console.log('❌ Session invalid, clearing...');
          this.clearSession();
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize auth:', error);
    }
    
    return false;
  }

  async login(credentials) {
    console.log(`🔑 Attempting login for user: ${credentials.username}`);
    
    try {
      // Call Tauri backend for authentication
      const result = await invoke('authenticate_user', {
        username: credentials.username,
        password: credentials.password
      });
      
      if (result.success) {
        console.log('✅ Authentication successful');
        
        // Set current user
        this.currentUser = {
          username: credentials.username,
          token: result.token,
          permissions: result.permissions || []
        };
        this.isAuthenticated = true;
        
        // Store session if remember me is enabled
        if (credentials.rememberMe) {
          this.storeSession({
            username: credentials.username,
            token: result.token,
            timestamp: Date.now()
          });
        }
        
        // Load user vault permissions
        await this.loadUserPermissions();
        
        return {
          success: true,
          token: result.token,
          user: this.currentUser
        };
      } else {
        console.log('❌ Authentication failed');
        return {
          success: false,
          message: result.message || 'Invalid credentials'
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // For development/demo purposes, allow a demo user
      if (credentials.username === 'demo' && credentials.password === 'demo123') {
        console.log('🎭 Using demo authentication');
        this.currentUser = {
          username: 'demo',
          token: 'demo-token-' + Date.now(),
          permissions: ['read', 'write']
        };
        this.isAuthenticated = true;
        
        if (credentials.rememberMe) {
          this.storeSession({
            username: 'demo',
            token: this.currentUser.token,
            timestamp: Date.now()
          });
        }
        
        return {
          success: true,
          token: this.currentUser.token,
          user: this.currentUser
        };
      }
      
      return {
        success: false,
        message: 'Authentication failed'
      };
    }
  }

  async logout() {
    console.log('🚪 Logging out user');
    
    try {
      // Call backend to invalidate session
      if (this.currentUser?.token) {
        await invoke('logout_user', { token: this.currentUser.token });
      }
    } catch (error) {
      console.error('⚠️ Logout backend error:', error);
    }
    
    // Clear local state
    this.currentUser = null;
    this.isAuthenticated = false;
    this.vaultPermissions.clear();
    this.clearSession();
    
    console.log('✅ Logout complete');
  }

  async validateSession(session) {
    console.log('🔍 Validating session');
    
    try {
      // Check if session is expired (24 hours)
      const sessionAge = Date.now() - session.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (sessionAge > maxAge) {
        console.log('⏰ Session expired');
        return false;
      }
      
      // Validate token with backend
      const result = await invoke('validate_session', { token: session.token });
      return result.valid;
    } catch (error) {
      console.error('❌ Session validation error:', error);
      
      // For demo purposes, validate demo tokens
      if (session.token?.startsWith('demo-token-')) {
        return true;
      }
      
      return false;
    }
  }

  async loadUserPermissions() {
    console.log('📋 Loading user permissions');
    
    try {
      const permissions = await invoke('get_user_permissions', {
        username: this.currentUser.username
      });
      
      // Store vault-specific permissions
      if (permissions.vaults) {
        permissions.vaults.forEach(vault => {
          this.vaultPermissions.set(vault.path, vault.access);
        });
      }
      
      console.log(`✅ Loaded permissions for ${this.vaultPermissions.size} vaults`);
    } catch (error) {
      console.error('❌ Failed to load permissions:', error);
      
      // For demo user, grant full access
      if (this.currentUser?.username === 'demo') {
        console.log('🎭 Granting demo user full access');
        this.vaultPermissions.set('*', ['read', 'write']);
      }
    }
  }

  canAccessVault(vaultPath) {
    console.log(`🔍 Checking vault access for: ${vaultPath}`);
    
    if (!this.isAuthenticated) {
      console.log('❌ User not authenticated');
      return false;
    }
    
    // Check specific vault permissions
    if (this.vaultPermissions.has(vaultPath)) {
      const access = this.vaultPermissions.get(vaultPath);
      console.log(`✅ Vault access: ${access.join(', ')}`);
      return access.includes('read');
    }
    
    // Check wildcard permissions
    if (this.vaultPermissions.has('*')) {
      const access = this.vaultPermissions.get('*');
      console.log(`✅ Wildcard access: ${access.join(', ')}`);
      return access.includes('read');
    }
    
    console.log('❌ No vault access');
    return false;
  }

  canWriteToVault(vaultPath) {
    console.log(`🔍 Checking write access for: ${vaultPath}`);
    
    if (!this.isAuthenticated) {
      return false;
    }
    
    // Check specific vault permissions
    if (this.vaultPermissions.has(vaultPath)) {
      return this.vaultPermissions.get(vaultPath).includes('write');
    }
    
    // Check wildcard permissions
    if (this.vaultPermissions.has('*')) {
      return this.vaultPermissions.get('*').includes('write');
    }
    
    return false;
  }

  // Session management
  storeSession(sessionData) {
    console.log('💾 Storing session');
    try {
      localStorage.setItem('aura-auth-session', JSON.stringify(sessionData));
      console.log('✅ Session stored');
    } catch (error) {
      console.error('❌ Failed to store session:', error);
    }
  }

  loadStoredSession() {
    console.log('📂 Loading stored session');
    try {
      const data = localStorage.getItem('aura-auth-session');
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('❌ Failed to load session:', error);
    }
    return null;
  }

  clearSession() {
    console.log('🗑️ Clearing session');
    try {
      localStorage.removeItem('aura-auth-session');
      console.log('✅ Session cleared');
    } catch (error) {
      console.error('❌ Failed to clear session:', error);
    }
  }

  // User info
  getCurrentUser() {
    return this.currentUser;
  }

  isUserAuthenticated() {
    return this.isAuthenticated;
  }
}

// Create singleton instance
export const authManager = new AuthManager();
console.log('✅ AuthManager module loaded successfully');