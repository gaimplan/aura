// Tauri v2 Modern Approach with CodeMirror Editor Integration
console.log('🚀 TAURI V2 APPROACH WITH EDITOR - Loading...');

// Import Tauri v2 APIs and editor components
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { ask } from '@tauri-apps/plugin-dialog';
import { MarkdownEditor } from './editor/markdown-editor.js';
import { ThemeManager } from './editor/theme-manager.js';
import { markdownExtensions, markdownStyles } from './editor/markdown-extensions.js';
import { PaneManager } from './PaneManager.js';
import { EnhancedChatPanel } from './chat/EnhancedChatPanel.js';

console.log('✅ Tauri v2 APIs and editor components imported successfully!');
console.log('🔍 EnhancedChatPanel class:', EnhancedChatPanel);

// Global state
window.expandedFolders = new Set();
let currentEditor = null;
let currentThemeManager = null;
let currentFile = null;
let appInitialized = false;
let paneManager = null;
window.paneManager = null; // Make accessible globally
let statusBarVisible = true; // Global status bar visibility state
let chatPanel = null; // Enhanced chat panel
window.chatPanel = null; // Make accessible globally

// Initialize Enhanced Chat Panel
async function initializeChatPanel() {
  console.log('💬 Initializing Enhanced Chat Panel...');
  
  const chatContainer = document.getElementById('chat-panel-container');
  if (!chatContainer) {
    console.error('❌ Chat panel container not found in DOM');
    console.log('🔍 Available containers:', document.querySelectorAll('[id*="chat"]'));
    return;
  }
  
  try {
    console.log('🔧 Creating EnhancedChatPanel instance...');
    chatPanel = new EnhancedChatPanel();
    window.chatPanel = chatPanel;
    
    console.log('📌 Mounting chat panel to container...');
    await chatPanel.mount(chatContainer);
    console.log('✅ Enhanced Chat Panel initialized successfully');
    console.log('🔍 Chat panel object:', chatPanel);
  } catch (error) {
    console.error('❌ Failed to initialize Enhanced Chat Panel:', error);
    console.error('📋 Error details:', error.stack);
  }
}

// Initialize CodeMirror editor with panes
async function initializeEditor() {
  const editorWrapper = document.getElementById('editor-wrapper');
  if (!editorWrapper) {
    console.error('❌ Editor wrapper not found');
    return;
  }

  try {
    console.log('🔲 Creating PaneManager...');
    paneManager = new PaneManager();
    window.paneManager = paneManager; // Make accessible globally
    console.log('✅ PaneManager created');
    
    // Clear editor wrapper and mount PaneManager
    editorWrapper.innerHTML = '';
    paneManager.mount(editorWrapper);
    
    // Get the initial TabManager from the first pane
    const tabManager = paneManager.getActiveTabManager();
    window.tabManager = tabManager; // Keep compatibility with NewTabScreen
    
    // Update window.tabManager when pane is activated
    paneManager.on('pane-activated', ({ paneId }) => {
      window.tabManager = paneManager.getTabManager(paneId);
    });
    
    // Listen for tab changes to update editor reference
    tabManager.on('tab-changed', ({ tabId }) => {
      const tab = tabManager.getActiveTab();
      if (tab) {
        currentEditor = tab.editor;
        currentFile = tab.filePath;
        updateEditorHeader(tab.title);
        updateWordCount();
        
        // Apply theme to new editor
        if (currentThemeManager) {
          currentThemeManager.setEditor(currentEditor);
        }
        
        // Show editor wrapper
        const editorWrapper = document.getElementById('editor-wrapper');
        if (editorWrapper) {
          editorWrapper.style.display = 'block';
        }
        const welcomeContainer = document.querySelector('.welcome-container');
        if (welcomeContainer) {
          welcomeContainer.style.display = 'none';
        }
        
        // Apply global status bar visibility when switching tabs
        const statusBar = document.getElementById('editor-status-bar');
        if (statusBar) {
          statusBar.style.display = statusBarVisible ? 'flex' : 'none';
        }
        
        // Update menu text to match current state
        const menuText = document.getElementById('status-bar-text');
        if (menuText) {
          menuText.textContent = statusBarVisible ? 'Hide status bar' : 'Show status bar';
        }
      } else {
        // No tabs, show welcome screen
        showWelcomeScreen();
      }
    });
    
    // Listen for tab closed to show welcome when no tabs
    tabManager.on('tab-closed', () => {
      if (tabManager.tabs.size === 0) {
        showWelcomeScreen();
      }
    });
    
    // Listen for editor changes to update dirty state
    tabManager.on('tab-created', ({ tabId, tab }) => {
      setupEditorChangeTracking(tabId, tab);
    });
    
    // Show welcome screen initially
    showWelcomeScreen();
    
    console.log('✅ Pane system initialized');
    
    // Set up keyboard shortcuts for tabs
    setupTabKeyboardShortcuts();
  } catch (error) {
    console.error('❌ Error initializing editor:', error);
    throw error;
  }
}

// Set up keyboard shortcuts for tab navigation
// Helper function to set up change tracking for an editor
function setupEditorChangeTracking(tabId, tab) {
  if (tab.editor && tab.editor.view) {
    // Use the editor's built-in change tracking
    const originalSetContent = tab.editor.setContent.bind(tab.editor);
    tab.editor.setContent = function(content) {
      originalSetContent(content);
      // Reset dirty state when content is set
      const tabManager = paneManager ? paneManager.getActiveTabManager() : null;
      if (tabManager) {
        tabManager.setTabDirty(tabId, false);
        // Update TabBar through the active pane
        const activePane = paneManager.panes.get(paneManager.activePaneId);
        if (activePane && activePane.tabBar) {
          activePane.tabBar.updateTabDirtyState(tabId, false);
        }
      }
    };
    
    // Mark as dirty on any edit
    const originalDispatch = tab.editor.view.dispatch.bind(tab.editor.view);
    tab.editor.view.dispatch = function(tr) {
      originalDispatch(tr);
      if (tr.docChanged && tab.filePath) {
        const tabManager = paneManager ? paneManager.getActiveTabManager() : null;
        if (tabManager) {
          tabManager.setTabDirty(tabId, true);
          // Update TabBar through the active pane
          const activePane = paneManager.panes.get(paneManager.activePaneId);
          if (activePane && activePane.tabBar) {
            activePane.tabBar.updateTabDirtyState(tabId, true);
          }
        }
      }
    };
  }
}

// Global callback for when files are saved - clears dirty state
window.onFileSaved = function(filePath) {
  if (!paneManager) return
  
  // Find the tab with this file path in all panes
  for (const [paneId, pane] of paneManager.panes) {
    const tab = pane.tabManager.findTabByPath(filePath)
    if (tab) {
      console.log('🧹 Clearing dirty state for saved file:', filePath)
      pane.tabManager.setTabDirty(tab.id, false)
      if (pane.tabBar) {
        pane.tabBar.updateTabDirtyState(tab.id, false)
      }
      break
    }
  }
}

function setupTabKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tabManager = paneManager ? paneManager.getActiveTabManager() : null;
    if (!tabManager) return;
    
    // Cmd+T: New Tab
    if (e.metaKey && e.key === 't') {
      e.preventDefault();
      if (tabManager.tabs.size < tabManager.maxTabs) {
        const tabId = tabManager.createTab();
        tabManager.activateTab(tabId);
      }
    }
    
    // Cmd+W: Close current tab
    if (e.metaKey && e.key === 'w') {
      e.preventDefault();
      const activeTab = tabManager.getActiveTab();
      if (activeTab) {
        tabManager.closeTab(activeTab.id);
      }
    }
    
    // Cmd+Tab: Next tab
    if (e.metaKey && e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const tabs = tabManager.getTabs();
      const activeTab = tabManager.getActiveTab();
      if (activeTab && tabs.length > 1) {
        const currentIndex = tabs.findIndex(t => t.id === activeTab.id);
        const nextIndex = (currentIndex + 1) % tabs.length;
        tabManager.activateTab(tabs[nextIndex].id);
      }
    }
    
    // Cmd+Shift+Tab: Previous tab
    if (e.metaKey && e.shiftKey && e.key === 'Tab') {
      e.preventDefault();
      const tabs = tabManager.getTabs();
      const activeTab = tabManager.getActiveTab();
      if (activeTab && tabs.length > 1) {
        const currentIndex = tabs.findIndex(t => t.id === activeTab.id);
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        tabManager.activateTab(tabs[prevIndex].id);
      }
    }
    
    // Cmd+1-5: Switch to specific tab
    if (e.metaKey && e.key >= '1' && e.key <= '5') {
      e.preventDefault();
      const tabIndex = parseInt(e.key) - 1;
      const tabs = tabManager.getTabs();
      if (tabIndex < tabs.length) {
        tabManager.activateTab(tabs[tabIndex].id);
      }
    }
    
    // Cmd+\: Toggle split view
    if (e.metaKey && e.key === '\\') {
      e.preventDefault();
      window.toggleSplitView();
    }
    
    // Cmd+Option+Z: Toggle zen mode
    if (e.metaKey && e.altKey && (e.key === 'z' || e.key === 'Ω')) {
      e.preventDefault();
      console.log('🔑 Zen mode shortcut triggered');
      window.toggleZenMode();
    }
    
    // ESC to exit zen mode
    if (e.key === 'Escape' && isZenMode) {
      e.preventDefault();
      window.toggleZenMode();
    }
    
    // Cmd+N: Create new note in root folder
    if (e.metaKey && e.key === 'n') {
      e.preventDefault();
      console.log('📝 Creating new note with Cmd+N');
      window.showCreateFileModal('');
    }
    
    // Cmd+Shift+C: Toggle AI Chat Panel
    if (e.metaKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      console.log('💬 Toggling chat panel with Cmd+Shift+C');
      window.toggleChatPanel();
    }
    
    // Cmd+Shift+E: Export to PDF
    if (e.metaKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      console.log('📄 Export to PDF with Cmd+Shift+E');
      window.exportToPDF();
    }
    
    // Cmd+Shift+W: Export to Word
    if (e.metaKey && e.shiftKey && e.key === 'W') {
      e.preventDefault();
      console.log('📄 Export to Word with Cmd+Shift+W');
      window.exportToWord();
    }
  });
}

async function loadEditorPreferences(editor) {
  try {
    const prefs = await invoke('get_editor_preferences');
    
    // Create theme manager if needed
    if (!currentThemeManager) {
      currentThemeManager = new ThemeManager(editor);
    } else {
      currentThemeManager.setEditor(editor);
    }
    
    // Apply theme (default to 'default' if not set)
    const themeToUse = prefs.theme || 'default';
    currentThemeManager.applyTheme(themeToUse);
    
    // Apply font size (default to 16 if not set)
    const fontSize = prefs.font_size || 16;
    editor.view.dispatch({
      effects: editor.fontSizeCompartment.reconfigure(
        editor.createFontSizeTheme(fontSize)
      )
    });
    
    // Apply line wrapping (default to true if not set)
    const lineWrapping = prefs.line_wrapping !== false;
    if (!lineWrapping) {
      editor.view.dispatch({
        effects: editor.lineWrappingCompartment.reconfigure([])
      });
    }
    
    console.log('✅ Editor preferences loaded');
  } catch (error) {
    console.log('⚠️ No editor preferences found, using defaults');
    // Create default theme manager
    if (!currentThemeManager) {
      currentThemeManager = new ThemeManager(editor);
      currentThemeManager.applyTheme('default');
    }
  }
}

// Simple initialization - no complex waiting needed with Tauri v2
async function initTauri() {
  console.log('🚀 Tauri v2: Ready to use!');
  console.log('✅ invoke function type:', typeof invoke);
  console.log('✅ dialog open function type:', typeof open);
}

// Vault name prompt modal
async function promptForVaultName() {
  return new Promise((resolve) => {
    const modalHTML = `
      <div id="vault-name-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Create New Vault</h3>
          </div>
          <div class="modal-body">
            <p class="modal-description">A new folder will be created with this name:</p>
            <label for="vault-name-input">Vault Name:</label>
            <input type="text" id="vault-name-input" placeholder="My Vault" value="My Vault" autofocus spellcheck="false">
          </div>
          <div class="modal-footer">
            <button id="vault-cancel-btn" class="secondary-button">Cancel</button>
            <button id="vault-create-btn" class="primary-button">Create</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('vault-name-modal');
    const input = document.getElementById('vault-name-input');
    const cancelBtn = document.getElementById('vault-cancel-btn');
    const createBtn = document.getElementById('vault-create-btn');
    
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);
    
    createBtn.onclick = () => {
      const name = input.value.trim();
      modal.remove();
      resolve(name);
    };
    
    cancelBtn.onclick = () => {
      modal.remove();
      resolve(null);
    };
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createBtn.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelBtn.click();
      }
    };
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        cancelBtn.click();
      }
    };
  });
}

// Create new file modal
window.showCreateFileModal = async function(folderPath = '', event = null) {
  if (event) event.stopPropagation();
  
  console.log('📄 Opening create file modal for folder:', folderPath);
  
  const fileName = await promptForFileName(folderPath);
  if (!fileName || fileName.trim() === '') {
    console.log('❌ No file name provided');
    return;
  }
  
  try {
    const fullPath = folderPath ? `${folderPath}/${fileName.trim()}` : fileName.trim();
    console.log('📝 Creating new file:', fullPath);
    await invoke('create_new_file', { fileName: fullPath });
    console.log('✅ File created successfully');
    
    if (folderPath) {
      window.expandedFolders.add(folderPath);
    }
    
    refreshFileTree();
    
    setTimeout(() => {
      window.handleFileClick(fullPath, false);
    }, 100);
    
  } catch (error) {
    console.error('❌ Failed to create file:', error);
    showError('Failed to create file: ' + error);
  }
};

// Create new folder modal
window.showCreateFolderModal = async function() {
  console.log('📁 Opening create folder modal...');
  
  const folderName = await promptForFolderName();
  if (!folderName || folderName.trim() === '') {
    console.log('❌ No folder name provided');
    return;
  }
  
  try {
    console.log('📂 Creating new folder:', folderName);
    await invoke('create_new_folder', { folderName: folderName.trim() });
    console.log('✅ Folder created successfully');
    
    const fileTree = await invoke('get_file_tree');
    displayFileTree(fileTree);
    
  } catch (error) {
    console.error('❌ Failed to create folder:', error);
    showError('Failed to create folder: ' + error);
  }
};

// File name prompt modal
async function promptForFileName(folderPath = '') {
  return new Promise((resolve) => {
    const locationText = folderPath ? `in folder "${folderPath}"` : 'in vault root';
    const modalHTML = `
      <div id="file-name-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Create New File</h3>
          </div>
          <div class="modal-body">
            <p class="modal-description">Creating new markdown file ${locationText}:</p>
            <label for="file-name-input">File Name:</label>
            <input type="text" id="file-name-input" placeholder="My Note.md" value="Untitled.md" autofocus spellcheck="false">
          </div>
          <div class="modal-footer">
            <button id="file-cancel-btn" class="secondary-button">Cancel</button>
            <button id="file-create-btn" class="primary-button">Create File</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('file-name-modal');
    const input = document.getElementById('file-name-input');
    const cancelBtn = document.getElementById('file-cancel-btn');
    const createBtn = document.getElementById('file-create-btn');
    
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);
    
    createBtn.onclick = () => {
      let name = input.value.trim();
      if (name && !name.toLowerCase().endsWith('.md')) {
        name += '.md';
      }
      modal.remove();
      resolve(name);
    };
    
    cancelBtn.onclick = () => {
      modal.remove();
      resolve(null);
    };
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createBtn.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelBtn.click();
      }
    };
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        cancelBtn.click();
      }
    };
  });
}

// Folder name prompt modal
async function promptForFolderName() {
  return new Promise((resolve) => {
    const modalHTML = `
      <div id="folder-name-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Create New Folder</h3>
          </div>
          <div class="modal-body">
            <p class="modal-description">Enter the name for your new folder:</p>
            <label for="folder-name-input">Folder Name:</label>
            <input type="text" id="folder-name-input" placeholder="My Folder" value="New Folder" autofocus spellcheck="false">
          </div>
          <div class="modal-footer">
            <button id="folder-cancel-btn" class="secondary-button">Cancel</button>
            <button id="folder-create-btn" class="primary-button">Create Folder</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('folder-name-modal');
    const input = document.getElementById('folder-name-input');
    const cancelBtn = document.getElementById('folder-cancel-btn');
    const createBtn = document.getElementById('folder-create-btn');
    
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);
    
    createBtn.onclick = () => {
      const name = input.value.trim();
      modal.remove();
      resolve(name);
    };
    
    cancelBtn.onclick = () => {
      modal.remove();
      resolve(null);
    };
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createBtn.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelBtn.click();
      }
    };
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        cancelBtn.click();
      }
    };
  });
}

// Global functions for vault menu
window.toggleVaultMenu = function() {
  console.log('🔽 Toggling vault menu...');
  const dropdown = document.getElementById('vault-dropdown');
  const sortDropdown = document.getElementById('sort-dropdown');
  
  if (dropdown) {
    dropdown.classList.toggle('hidden');
    console.log('📋 Menu visibility:', !dropdown.classList.contains('hidden'));
    
    // Close sort dropdown if open
    if (sortDropdown && !sortDropdown.classList.contains('hidden')) {
      sortDropdown.classList.add('hidden');
    }
  }
};

// Global sort state
let currentSortOption = localStorage.getItem('aura-sort-option') || 'alphabetical';

// Sort menu functions
window.toggleSortMenu = function() {
  console.log('🔽 Toggling sort menu...');
  const dropdown = document.getElementById('sort-dropdown');
  const vaultDropdown = document.getElementById('vault-dropdown');
  
  if (dropdown) {
    dropdown.classList.toggle('hidden');
    console.log('📋 Sort menu visibility:', !dropdown.classList.contains('hidden'));
    
    // Close vault dropdown if open
    if (vaultDropdown && !vaultDropdown.classList.contains('hidden')) {
      vaultDropdown.classList.add('hidden');
    }
  }
};

window.setSortOption = function(option) {
  console.log('📊 Setting sort option:', option);
  currentSortOption = option;
  
  // Hide the dropdown
  const dropdown = document.getElementById('sort-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
  
  // Save preference
  localStorage.setItem('aura-sort-option', option);
  
  // Refresh the file tree with new sort
  refreshFileTree();
};

// Helper function to rebuild editor header with all controls
function updateEditorHeader(fileName = 'Welcome to Aura') {
  const fileNameEl = document.querySelector('.file-name');
  if (fileNameEl) {
    fileNameEl.textContent = fileName;
  }
}

function rebuildEditorHeader(fileName = 'Welcome to Aura') {
  const editorHeader = document.getElementById('editor-header');
  if (editorHeader) {
    editorHeader.innerHTML = `
      <div class="editor-left-controls">
        <button id="sidebar-toggle" class="editor-control-btn" onclick="toggleSidebar()" title="Toggle Sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="9" x2="9" y2="15"></line>
          </svg>
        </button>
        <button id="zen-mode-btn" class="editor-control-btn" onclick="toggleZenMode()" title="Zen Mode (Cmd+Option+Z)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M12 2a10 10 0 0 1 0 20 5 5 0 0 1 0-10 5 5 0 0 0 0-10z" fill="currentColor"/>
            <circle cx="12" cy="7" r="1.5" fill="white"/>
            <circle cx="12" cy="17" r="1.5" fill="currentColor"/>
          </svg>
        </button>
      </div>
      <span class="file-name">${fileName}</span>
      <div class="editor-controls">
        <button id="chat-toggle-btn" class="editor-control-btn" onclick="toggleChatPanel()" title="AI Chat (Cmd+Shift+C)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        <button id="copy-all-btn" class="editor-control-btn" onclick="copyAllText()" title="Copy All Text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        <div class="editor-menu-container">
          <button id="editor-menu-btn" class="editor-control-btn" onclick="toggleEditorMenu()" title="Editor Menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div id="editor-dropdown" class="editor-dropdown hidden">
            <div class="editor-dropdown-item" onclick="toggleLineNumbers()">
              <span id="line-numbers-text">Show lines</span>
            </div>
            <div class="editor-dropdown-item" onclick="toggleStatusBar()">
              <span id="status-bar-text">Hide status bar</span>
            </div>
            <div class="editor-dropdown-divider"></div>
            <div class="editor-dropdown-item" onclick="generateHighlightsSummary()">
              <span>Generate Highlights Summary</span>
            </div>
            <div class="editor-dropdown-divider"></div>
            <div class="editor-dropdown-item" onclick="exportToPDF()">
              <span>Export as PDF</span>
            </div>
            <div class="editor-dropdown-item" onclick="exportToHTML()">
              <span>Export as HTML</span>
            </div>
            <div class="editor-dropdown-item" onclick="exportToWord()">
              <span>Export as Word (.doc)</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

window.closeCurrentVault = async function() {
  console.log('❌ Closing current vault...');
  
  // Clear the last vault preference
  try {
    await invoke('save_last_vault', { vaultPath: '' });
    console.log('✅ Cleared last vault preference');
  } catch (error) {
    console.error('⚠️ Failed to clear last vault:', error);
  }
  
  const dropdown = document.getElementById('vault-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
  
  const vaultNameEl = document.querySelector('.vault-name');
  if (vaultNameEl) {
    vaultNameEl.textContent = 'No Vault';
  }
  
  // Hide vault actions (sidebar ribbon)
  const vaultActions = document.getElementById('vault-actions');
  if (vaultActions) {
    vaultActions.style.display = 'none';
  }
  
  const fileTreeElement = document.getElementById('file-tree');
  if (fileTreeElement) {
    fileTreeElement.innerHTML = `
      <div class="empty-state">
        <p>No vault open</p>
        <button id="open-vault" class="primary-button" onclick="window.openVault()">Open Vault</button>
        <button id="create-vault" class="secondary-button" onclick="window.createVault()">Create Vault</button>
      </div>
    `;
  }
  
  // Close all tabs
  if (tabManager) {
    const tabs = tabManager.getTabs();
    tabs.forEach(tab => {
      tabManager.closeTab(tab.id, true); // Force close
    });
  }
  
  // Reset current references
  currentEditor = null;
  currentFile = null;
  
  // Show welcome screen
  showWelcomeScreen();
};

// Show welcome screen as a landing page
function showWelcomeScreen() {
  // Hide editor header/title bar on welcome screen
  const editorHeader = document.getElementById('editor-header');
  if (editorHeader) {
    editorHeader.style.display = 'none';
  }
  
  // Tab bars are now handled by PaneManager
  
  // Hide status bar on welcome screen
  const statusBar = document.getElementById('editor-status-bar');
  if (statusBar) {
    statusBar.style.display = 'none';
  }
  
  // Hide editor wrapper and show welcome landing page
  const editorWrapper = document.getElementById('editor-wrapper');
  if (editorWrapper) {
    editorWrapper.style.display = 'none';
  }
  
  // Add welcome container after editor wrapper
  const existingWelcome = document.querySelector('.welcome-container');
  if (existingWelcome) {
    existingWelcome.style.display = 'flex';
  } else {
    const editorContainer = document.querySelector('.editor-container');
    if (editorContainer) {
      const welcomeDiv = document.createElement('div');
      welcomeDiv.className = 'welcome-container';
      welcomeDiv.innerHTML = `
      <div class="welcome-landing-page">
        <div class="welcome-header">
          <h1>Welcome to Aura</h1>
          <img src="/aura-logo-transparent.png" alt="Aura Logo" class="welcome-logo" />
          <p>Open or create a vault to start managing your knowledge.</p>
        </div>
        
        <div class="features-section">
          <h3>Features</h3>
          <div class="feature-cards">
            <div class="feature-card">
              <div class="feature-icon">📁</div>
              <h3>Local Files</h3>
              <p>Your notes are stored as plain Markdown files on your computer.</p>
            </div>
            
            <div class="feature-card">
              <div class="feature-icon">🔒</div>
              <h3>Private</h3>
              <p>No Telemetry. No tracking. No ads.</p>
            </div>
            
            <div class="feature-card">
              <div class="feature-icon">⚡</div>
              <h3>Fast</h3>
              <p>Native performance with a lightweight design.</p>
            </div>
          </div>
        </div>
      </div>
    `;
      editorContainer.appendChild(welcomeDiv);
    }
  }
  
  console.log('✅ Welcome landing page displayed');
  currentFile = null;
}

// Global functions for vault management
window.openVault = async function() {
  console.log('🎯 Opening vault...');
  
  const dropdown = document.getElementById('vault-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
  
  const btn = document.getElementById('open-vault');
  
  try {
    if (btn) {
      btn.textContent = 'Selecting...';
      btn.disabled = true;
    }
    
    console.log('📁 Opening folder selection dialog...');
    const folderPath = await open({
      directory: true,
      multiple: false
    });
    
    if (!folderPath) {
      console.log('❌ No folder selected');
      return;
    }
    
    console.log('📂 Selected folder:', folderPath);
    
    if (btn) btn.textContent = 'Opening...';
    const vaultInfo = await invoke('open_vault', { path: folderPath });
    
    console.log('✅ Vault opened:', vaultInfo);
    updateUIWithVault(vaultInfo);
    
  } catch (error) {
    console.error('❌ Error opening vault:', error);
    showError('Failed to open vault: ' + error);
  } finally {
    if (btn) {
      btn.textContent = 'Open Vault';
      btn.disabled = false;
    }
  }
};

window.createVault = async function() {
  console.log('🎯 Creating new vault...');
  
  const dropdown = document.getElementById('vault-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
  
  const btn = document.getElementById('create-vault');
  
  try {
    if (btn) {
      btn.textContent = 'Selecting...';
      btn.disabled = true;
    }
    
    console.log('📁 Opening directory selection dialog...');
    const parentPath = await open({
      directory: true,
      multiple: false,
      title: 'Select directory where vault will be created'
    });
    
    if (!parentPath) {
      console.log('❌ No parent folder selected');
      return;
    }
    
    console.log('📂 Selected parent folder:', parentPath);
    
    console.log('📝 Prompting for vault name...');
    const vaultName = await promptForVaultName();
    if (!vaultName || vaultName.trim() === '') {
      console.log('❌ No vault name provided');
      return;
    }
    
    console.log('📝 Vault name:', vaultName);
    
    if (btn) btn.textContent = 'Creating...';
    const vaultInfo = await invoke('create_new_vault', { 
      parentPath: parentPath, 
      vaultName: vaultName.trim() 
    });
    
    console.log('✅ Vault created:', vaultInfo);
    updateUIWithVault(vaultInfo);
    
  } catch (error) {
    console.error('❌ Error creating vault:', error);
    showError('Failed to create vault: ' + error);
  } finally {
    if (btn) {
      btn.textContent = 'Create Vault';
      btn.disabled = false;
    }
  }
};

// Helper functions
async function updateUIWithVault(vaultInfo) {
  console.log('🔄 Updating UI with vault:', vaultInfo);
  
  // Save this as the last opened vault
  try {
    await invoke('save_last_vault', { vaultPath: vaultInfo.path });
    console.log('✅ Saved last vault path');
  } catch (error) {
    console.error('⚠️ Failed to save last vault:', error);
  }
  
  // Restore editor header if it was hidden during welcome screen
  const editorHeader = document.getElementById('editor-header');
  if (editorHeader) {
    editorHeader.style.display = 'flex';
  }
  
  
  const vaultNameEl = document.querySelector('.vault-name');
  if (vaultNameEl) {
    vaultNameEl.textContent = vaultInfo.name;
  }
  
  // Show vault actions (sidebar ribbon)
  const vaultActions = document.getElementById('vault-actions');
  if (vaultActions) {
    vaultActions.style.display = 'flex';
  }
  
  try {
    console.log('📁 Loading file tree...');
    const fileTree = await invoke('get_file_tree');
    console.log('📊 File tree loaded:', fileTree);
    
    displayFileTree(fileTree);
    
    // Start file system watcher for this vault
    console.log('👁️ Starting file system watcher...');
    await invoke('start_file_watcher', { vaultPath: vaultInfo.path });
    console.log('✅ File system watcher started');
  } catch (error) {
    console.error('❌ Failed to load file tree:', error);
    showFileTreeError(error);
  }
  
  // Show vault success message in editor
  if (currentEditor) {
    const successContent = `# 🎉 Vault Ready!

## ${vaultInfo.name}

Your vault is now open and ready to use.

**Location:** \`${vaultInfo.path}\`

*Click on any file in the sidebar to start editing!*

### Quick Tips

- Use **Ctrl/Cmd + S** to save files
- Create [[wiki links]] by typing \`[[Note Name]]\`
- Add #tags anywhere in your notes
- Use **Ctrl/Cmd + B** for bold, **Ctrl/Cmd + I** for italic
`;
    
    currentEditor.setContent(successContent);
    currentFile = null;
  }
}

function displayFileTree(fileTree) {
  console.log('🌲 Displaying file tree with', fileTree.files.length, 'items');
  console.log('📂 Currently expanded folders:', Array.from(window.expandedFolders));
  
  // Debug: Log first few items to see structure
  console.log('📊 Sample file tree items:', fileTree.files.slice(0, 5));
  
  // Debug: Show root level items
  const rootItems = fileTree.files.filter(f => !f.parent_path);
  console.log('🌳 Root level items:', rootItems.map(f => f.name));
  
  const fileTreeElement = document.getElementById('file-tree');
  if (!fileTreeElement) {
    console.error('❌ File tree element not found');
    return;
  }
  
  if (fileTree.files.length === 0) {
    fileTreeElement.innerHTML = `
      <div class="empty-vault">
        <p>📁 Vault is empty</p>
        <p><em>Create your first note to get started!</em></p>
      </div>
    `;
    return;
  }
  
  // Create a tree structure for proper sorting
  const buildTree = (files) => {
    const tree = new Map();
    
    // First pass: organize by parent
    files.forEach(file => {
      const parent = file.parent_path || '';
      if (!tree.has(parent)) {
        tree.set(parent, []);
      }
      tree.get(parent).push(file);
    });
    
    // Sort each level
    tree.forEach((children, parent) => {
      children.sort((a, b) => {
        // Always put directories before files
        if (a.is_dir !== b.is_dir) {
          return a.is_dir ? -1 : 1;
        }
        
        // Apply the selected sort option
        switch (currentSortOption) {
          case 'alphabetical':
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            
          case 'created':
            if (a.created !== null && b.created !== null) {
              return b.created - a.created;
            }
            if (a.created !== null) return -1;
            if (b.created !== null) return 1;
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            
          case 'modified':
            if (a.modified !== null && b.modified !== null) {
              return b.modified - a.modified;
            }
            if (a.modified !== null) return -1;
            if (b.modified !== null) return 1;
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            
          default:
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        }
      });
    });
    
    // Flatten the tree in depth-first order
    const result = [];
    const addToResult = (parentPath) => {
      const children = tree.get(parentPath) || [];
      children.forEach(child => {
        result.push(child);
        if (child.is_dir) {
          addToResult(child.path);
        }
      });
    };
    
    // Start from root
    addToResult('');
    
    return result;
  };
  
  const sortedFiles = buildTree(fileTree.files);
  
  let html = `
    <div class="file-tree-content">
  `;
  
  sortedFiles.forEach(file => {
    // Skip .obsidian folders and their contents
    if (file.name === '.obsidian' || file.path.includes('/.obsidian/')) {
      return;
    }
    
    // Debug Chat History folder and parent paths
    if (file.name === 'Chat History' || file.path.includes('Chat History')) {
      console.log('🔍 Found Chat History:', file);
      console.log('   Parent path:', file.parent_path);
      console.log('   Is parent expanded?', file.parent_path ? window.expandedFolders.has(file.parent_path) : 'N/A (root)');
    }
    
    // For files (not folders), check if their parent folder is expanded
    // For folders, always show if their parent is expanded (or if they're root level)
    if (file.parent_path) {
      // This item has a parent
      if (!window.expandedFolders.has(file.parent_path)) {
        // Parent is not expanded, skip this item
        console.log(`⏭️ Skipping ${file.path} because parent ${file.parent_path} is not expanded`);
        return;
      }
    }
    
    const indent = file.depth * 20;
    const isExpanded = window.expandedFolders.has(file.path);
    
    if (file.is_dir) {
      const expandIcon = isExpanded ? '▼' : '▶';
      const escapedPath = file.path.replace(/'/g, "\\'").replace(/"/g, "&quot;");
      
      html += `
        <div class="tree-item folder" data-path="${file.path}" style="padding-left: ${indent + 8}px;">
          <span class="expand-icon" onclick="toggleFolder('${escapedPath}', event)">${expandIcon}</span>
          <span class="tree-label" onclick="handleFolderClick('${escapedPath}', event)">${file.name}</span>
          <span class="folder-actions">
            <button class="folder-action-btn" onclick="showCreateFileModal('${escapedPath}', event)" title="New File in Folder">📄</button>
          </span>
        </div>
      `;
    } else {
      const escapedPath = file.path.replace(/'/g, "\\'").replace(/"/g, "&quot;");
      const fileIndent = indent + 24;
      
      // Remove file extension for display
      const displayName = file.name.replace(/\.(md|markdown|txt|doc|docx)$/i, '');
      
      html += `
        <div class="tree-item file" data-path="${file.path}" style="padding-left: ${fileIndent}px;" data-file-path="${escapedPath}">
          <span class="tree-label" onclick="handleFileClick('${escapedPath}', false)">${displayName}</span>
        </div>
      `;
    }
  });
  
  html += '</div>';
  fileTreeElement.innerHTML = html;
}

function showFileTreeError(error) {
  const fileTreeElement = document.getElementById('file-tree');
  if (fileTreeElement) {
    fileTreeElement.innerHTML = `
      <div class="error-state">
        <p>❌ Failed to load files</p>
        <p><em>${error}</em></p>
      </div>
    `;
  }
}

// Toggle folder expansion
window.toggleFolder = function(folderPath, event) {
  event.stopPropagation();
  console.log('🔽 Toggling folder:', folderPath);
  
  if (window.expandedFolders.has(folderPath)) {
    window.expandedFolders.delete(folderPath);
  } else {
    window.expandedFolders.add(folderPath);
  }
  
  refreshFileTree();
};

// Handle folder clicks
window.handleFolderClick = function(folderPath, event) {
  event.stopPropagation();
  console.log('📁 Folder clicked:', folderPath);
  window.toggleFolder(folderPath, event);
};

// Refresh file tree
async function refreshFileTree() {
  try {
    const fileTree = await invoke('get_file_tree');
    displayFileTree(fileTree);
  } catch (error) {
    console.error('❌ Failed to refresh file tree:', error);
  }
}

// Expose refreshFileTree globally
window.refreshFileTree = refreshFileTree;

// Listen for vault files changed events from frontend
window.addEventListener('vault-files-changed', () => {
  console.log('📁 Vault files changed (frontend event), refreshing file tree...');
  refreshFileTree();
});

// Listen for vault files changed events from Tauri backend
async function setupFileSystemWatcher() {
  try {
    const { listen } = await import('@tauri-apps/api/event');
    
    // Listen for file system changes from backend
    const unlisten = await listen('vault-files-changed', (event) => {
      console.log('📁 File system changed (backend event), refreshing file tree...');
      refreshFileTree();
    });
    
    // Store unlisten function for cleanup if needed
    window.fileWatcherUnlisten = unlisten;
  } catch (error) {
    console.error('Failed to setup file system watcher:', error);
  }
}

// Call this when DOM is ready
setupFileSystemWatcher();

// Handle file clicks with tabs
window.handleFileClick = async function(filePath, isDir) {
  console.log('🔍 File clicked:', filePath, 'isDir:', isDir);
  
  if (isDir) {
    console.log('📁 Directory clicked - not implemented yet');
    return;
  }
  
  // Check if this is an image file
  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif'];
  const fileExtension = filePath.split('.').pop().toLowerCase();
  const isImage = imageExtensions.includes(fileExtension);
  
  try {
    // Get the active pane's TabManager
    const tabManager = paneManager ? paneManager.getActiveTabManager() : null;
    if (!tabManager) {
      console.error('❌ No active TabManager found');
      return;
    }
    
    // Check if file is already open in any pane
    const existingPane = paneManager.findPaneByFilePath(filePath);
    if (existingPane) {
      console.log('📑 File already open in pane, switching to it');
      // Activate the pane and tab
      paneManager.activatePane(existingPane.id);
      const existingTab = existingPane.tabManager.findTabByPath(filePath);
      if (existingTab) {
        existingPane.tabManager.activateTab(existingTab.id);
      }
      return;
    }
    
    console.log('📖 Reading file:', filePath);
    let content;
    
    if (isImage) {
      // For images, create a markdown content that displays the image
      console.log('🖼️ Loading image file:', filePath);
      const filename = filePath.split('/').pop();
      content = `# ${filename}\n\n![[${filename}]]`;
    } else {
      content = await invoke('read_file_content', { filePath: filePath });
      console.log('📄 File content loaded, length:', content.length);
    }
    
    // Get the active tab or create one if none exist
    let activeTab = tabManager.getActiveTab();
    
    if (!activeTab || tabManager.tabs.size === 0) {
      // No tabs exist, create the first one
      const tabId = tabManager.createTab(filePath, content);
      activeTab = tabManager.tabs.get(tabId);
      await loadEditorPreferences(activeTab.editor);
      tabManager.activateTab(tabId);
    } else {
      // Replace content in active tab
      // Check if current tab has unsaved changes (but not for untitled tabs)
      if (activeTab.isDirty && activeTab.filePath) {
        const confirmed = confirm(`"${activeTab.title}" has unsaved changes. Continue without saving?`);
        if (!confirmed) {
          return;
        }
      }
      
      // Update the active tab with new file
      activeTab.filePath = filePath;
      activeTab.title = filePath.split('/').pop();
      activeTab.isDirty = false;
      
      // Check if we need to recreate the editor (for new tab screen)
      const hasNewTabScreen = activeTab.editorContainer.querySelector('.new-tab-screen');
      
      if (hasNewTabScreen || !activeTab.editor || !activeTab.editor.view) {
        // Clear new tab screen and recreate editor
        activeTab.editorContainer.innerHTML = '';
        activeTab.editor = new MarkdownEditor(activeTab.editorContainer);
        await loadEditorPreferences(activeTab.editor);
        setupEditorChangeTracking(activeTab.id, activeTab);
      }
      
      // Set content in the editor
      activeTab.editor.setContent(content);
      activeTab.editor.currentFile = filePath;
      
      // Update tab UI through the active pane's TabBar
      const activePane = paneManager.panes.get(paneManager.activePaneId);
      if (activePane && activePane.tabBar) {
        activePane.tabBar.updateTabTitle(activeTab.id, activeTab.title);
        activePane.tabBar.updateTabDirtyState(activeTab.id, false);
      }
      
      // Update global references
      currentFile = filePath;
      currentEditor = activeTab.editor;
      updateEditorHeader(activeTab.title);
      
      // Trigger tab change event to update UI properly
      tabManager.emit('tab-changed', { tabId: activeTab.id });
    }
    
    // Hide welcome screen if visible
    const welcomeContainer = document.querySelector('.welcome-container');
    if (welcomeContainer) {
      welcomeContainer.style.display = 'none';
    }
    
    // Show editor header if hidden
    const editorHeader = document.getElementById('editor-header');
    if (editorHeader) {
      editorHeader.style.display = 'flex';
    }
    
    // Apply global status bar visibility when opening a file
    const statusBar = document.getElementById('editor-status-bar');
    if (statusBar) {
      statusBar.style.display = statusBarVisible ? 'flex' : 'none';
    }
    
    // Update word count for the loaded content
    updateWordCount();
    
  } catch (error) {
    console.error('❌ Failed to read file:', error);
    showError('Failed to load file: ' + error);
  }
};

// Save current file
async function saveCurrentFile() {
  const tabManager = paneManager ? paneManager.getActiveTabManager() : null;
  if (!tabManager) return;
  
  const activeTab = tabManager.getActiveTab();
  if (!activeTab || !activeTab.filePath) {
    return;
  }
  
  // Don't save image files
  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif'];
  const fileExtension = activeTab.filePath.split('.').pop().toLowerCase();
  if (imageExtensions.includes(fileExtension)) {
    console.log('🖼️ Skipping save for image file');
    return;
  }
  
  try {
    console.log('💾 Saving file:', activeTab.filePath);
    const content = activeTab.editor.getContent();
    await invoke('write_file_content', { filePath: activeTab.filePath, content: content });
    activeTab.editor.hasUnsavedChanges = false;
    tabManager.setTabDirty(activeTab.id, false);
    
    // Update TabBar through the active pane
    const activePane = paneManager.panes.get(paneManager.activePaneId);
    if (activePane && activePane.tabBar) {
      activePane.tabBar.updateTabDirtyState(activeTab.id, false);
    }
    
    console.log('✅ File saved successfully');
  } catch (error) {
    console.error('❌ Failed to save file:', error);
    showError('Failed to save file: ' + error);
  }
}

function showError(message) {
  console.error('🚨 Showing error:', message);
  
  if (currentEditor) {
    const errorContent = `# ❌ Error

${message}

*Please check the console for more details.*`;
    currentEditor.setContent(errorContent);
  }
}

// Initialize everything
async function initializeApp() {
  if (appInitialized) {
    console.log('⚠️ App already initialized, skipping...');
    return;
  }
  
  console.log('🎯 Starting app initialization...');
  appInitialized = true;
  
  await initTauri();
  
  const appElement = document.querySelector('#app');
  
  if (appElement) {
    console.log('📝 Setting innerHTML...');
    appElement.innerHTML = `
      <div class="app-container">
        <div class="sidebar">
          <div class="sidebar-header">
            <h2 class="vault-name">No Vault</h2>
            <div class="header-actions">
              <div class="vault-menu-container">
                <button id="vault-menu" class="icon-button" title="Vault menu" onclick="toggleVaultMenu()">⋮</button>
                <div id="vault-dropdown" class="vault-dropdown hidden">
                  <div class="dropdown-item" onclick="window.openVault()">
                    <span class="dropdown-icon">📁</span>
                    <span class="dropdown-label">Open Vault</span>
                  </div>
                  <div class="dropdown-item" onclick="window.createVault()">
                    <span class="dropdown-icon">➕</span>
                    <span class="dropdown-label">Create Vault</span>
                  </div>
                  <div class="dropdown-divider"></div>
                  <div class="dropdown-item" onclick="closeCurrentVault()">
                    <span class="dropdown-icon">❌</span>
                    <span class="dropdown-label">Close Vault</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="file-tree" id="file-tree">
            <div class="empty-state">
              <p>No vault open</p>
              <button id="open-vault" class="primary-button" onclick="window.openVault()">Open Vault</button>
              <button id="create-vault" class="secondary-button" onclick="window.createVault()">Create Vault</button>
            </div>
          </div>
          <div class="sidebar-ribbon" id="vault-actions" style="display: none;">
            <button class="ribbon-button" onclick="showCreateFileModal('')" title="New File">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </button>
            <button class="ribbon-button" onclick="showCreateFolderModal('')" title="New Folder">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
            </button>
            <button class="ribbon-button" onclick="refreshFileTree()" title="Refresh files">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"/>
                <path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
            <div class="sort-menu-container">
              <button id="sort-menu" class="ribbon-button" title="Sort files" onclick="toggleSortMenu()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
                  <path d="M3 6h18M7 12h10M11 18h2"/>
                </svg>
              </button>
              <div id="sort-dropdown" class="sort-dropdown hidden">
                <div class="dropdown-item" onclick="setSortOption('alphabetical')">
                  <span class="dropdown-icon">🔤</span>
                  <span class="dropdown-label">Alphabetical</span>
                </div>
                <div class="dropdown-item" onclick="setSortOption('created')">
                  <span class="dropdown-icon">📅</span>
                  <span class="dropdown-label">Date Created</span>
                </div>
                <div class="dropdown-item" onclick="setSortOption('modified')">
                  <span class="dropdown-icon">🕐</span>
                  <span class="dropdown-label">Date Modified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="editor-container">
          <div class="editor-header" id="editor-header">
            <div class="editor-left-controls">
              <button id="sidebar-toggle" class="editor-control-btn" onclick="toggleSidebar()" title="Toggle Sidebar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="9" x2="9" y2="15"></line>
                </svg>
              </button>
              <button id="zen-mode-btn" class="editor-control-btn" onclick="toggleZenMode()" title="Zen Mode (Cmd+Option+Z)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 2a10 10 0 0 1 0 20 5 5 0 0 1 0-10 5 5 0 0 0 0-10z" fill="currentColor"/>
                  <circle cx="12" cy="7" r="1.5" fill="white"/>
                  <circle cx="12" cy="17" r="1.5" fill="currentColor"/>
                </svg>
              </button>
            </div>
            <span class="file-name">Welcome to Aura</span>
            <div class="editor-controls">
              <button id="chat-toggle-btn" class="editor-control-btn" onclick="toggleChatPanel()" title="AI Chat (Cmd+Shift+C)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
              <button id="split-view-btn" class="editor-control-btn" onclick="toggleSplitView()" title="Split View">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="12" y1="3" x2="12" y2="21"></line>
                </svg>
              </button>
              <div class="editor-menu-container">
                <button id="editor-menu-btn" class="editor-control-btn" onclick="toggleEditorMenu()" title="Editor Menu">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                </button>
                <div id="editor-dropdown" class="editor-dropdown hidden">
                  <div class="editor-dropdown-item" onclick="toggleLineNumbers()">
                    <span id="line-numbers-text">Show lines</span>
                  </div>
                  <div class="editor-dropdown-item" onclick="toggleStatusBar()">
                    <span id="status-bar-text">Hide status bar</span>
                  </div>
                  <div class="editor-dropdown-item" onclick="toggleZenMode()">
                    <span id="zen-mode-text">Enter zen mode</span>
                  </div>
                  <div class="editor-dropdown-divider"></div>
                  <div class="editor-dropdown-item" onclick="generateHighlightsSummary()">
                    <span>Generate Highlights Summary</span>
                  </div>
                  <div class="editor-dropdown-divider"></div>
                  <div class="editor-dropdown-item" onclick="exportToPDF()">
                    <span>Export as PDF</span>
                  </div>
                  <div class="editor-dropdown-item" onclick="exportToHTML()">
                    <span>Export as HTML</span>
                  </div>
                  <div class="editor-dropdown-item" onclick="exportToWord()">
                    <span>Export as Word (.doc)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div id="editor-wrapper" class="editor-wrapper">
            <div id="editor-container" class="editor"></div>
          </div>
          <div class="editor-status-bar" id="editor-status-bar">
            <span id="word-count">0 words</span>
            <span id="char-count">0 characters</span>
          </div>
        </div>
        
        <!-- Right Sidebar for Chat -->
        <div class="right-sidebar" id="right-sidebar">
          <div class="chat-resize-handle" id="chat-resize-handle"></div>
          <div id="chat-panel-container"></div>
        </div>
        
        <!-- Context Menu -->
        <div id="file-context-menu" class="context-menu hidden">
          <div class="context-menu-item" data-action="delete">
            Delete
          </div>
          <div class="context-menu-item" data-action="move">
            Move file to...
          </div>
          <div class="context-menu-item" data-action="rename">
            Rename
          </div>
        </div>
        
        <!-- Rename Modal -->
        <div id="rename-modal" class="modal hidden">
          <div class="modal-backdrop" onclick="closeRenameModal()"></div>
          <div class="modal-content">
            <h3>Rename File</h3>
            <input type="text" id="rename-input" class="modal-input" />
            <div class="modal-buttons">
              <button onclick="confirmRename()">Rename</button>
              <button onclick="closeRenameModal()">Cancel</button>
            </div>
          </div>
        </div>
        
        <!-- Move Modal -->
        <div id="move-modal" class="modal hidden">
          <div class="modal-backdrop" onclick="closeMoveModal()"></div>
          <div class="modal-content modal-move">
            <input type="text" id="move-filter" class="modal-input" placeholder="Type a folder" />
            <div id="move-folder-list" class="move-folder-list">
              <!-- Folders will be populated here -->
            </div>
            <div class="move-shortcuts">
              <span>↑↓ to navigate</span>
              <span>↵ to move</span>
              <span>shift ↵ to create</span>
              <span>esc to dismiss</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    console.log('✅ UI HTML set successfully');
    
    // Initialize CodeMirror editor
    await initializeEditor();
    
    // Initialize Enhanced Chat Panel
    await initializeChatPanel();
    
    // Check for last opened vault
    try {
      const lastVault = await invoke('get_last_vault');
      if (lastVault) {
        console.log('🔄 Found last vault:', lastVault);
        // Open the last vault
        const vaultInfo = await invoke('open_vault', { path: lastVault });
        console.log('✅ Reopened last vault:', vaultInfo);
        await updateUIWithVault(vaultInfo);
      } else {
        // No last vault, show welcome screen
        showWelcomeScreen();
      }
    } catch (error) {
      console.error('⚠️ Failed to load last vault:', error);
      // Show welcome screen as fallback
      showWelcomeScreen();
    }
    
    // Add keyboard support for rename modal
    const renameInput = document.getElementById('rename-input');
    if (renameInput) {
      renameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.confirmRename();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          window.closeRenameModal();
        }
      });
    }
    
    // Add keyboard support for move modal
    const moveFilter = document.getElementById('move-filter');
    if (moveFilter) {
      // Handle filter input changes
      moveFilter.addEventListener('input', function(e) {
        displayFolders(e.target.value);
      });
      
      // Handle keyboard navigation
      moveFilter.addEventListener('keydown', function(e) {
        const filtered = moveFilter.value ? 
          availableFolders.filter(f => 
            f.display.toLowerCase().includes(moveFilter.value.toLowerCase())
          ) : availableFolders;
        
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedFolderIndex = Math.min(selectedFolderIndex + 1, filtered.length - 1);
          displayFolders(moveFilter.value);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedFolderIndex = Math.max(selectedFolderIndex - 1, 0);
          displayFolders(moveFilter.value);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Enter to create new folder
            const newFolderName = moveFilter.value.trim();
            if (newFolderName) {
              createAndMoveToFolder(newFolderName);
            }
          } else {
            // Enter to move to selected folder
            if (filtered[selectedFolderIndex]) {
              confirmMove(filtered[selectedFolderIndex].path);
            }
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          window.closeMoveModal();
        }
      });
    }
    
    // Set up context menu handling for file items
    document.addEventListener('contextmenu', function(e) {
      // Check if the right-clicked element is a file item or inside one
      const fileItem = e.target.closest('.tree-item.file');
      if (fileItem) {
        e.preventDefault();
        // Use data-path instead of data-file-path to get the unescaped path
        const filePath = fileItem.getAttribute('data-path');
        if (filePath) {
          window.showFileContextMenu(e, filePath);
        }
        return false;
      }
      // Allow browser context menu for everything else
    }, true);
    
    // Set up click handling for context menu items
    const contextMenu = document.getElementById('file-context-menu');
    if (contextMenu) {
      contextMenu.addEventListener('click', function(e) {
        e.stopPropagation(); // Stop event from bubbling
        
        const menuItem = e.target.closest('.context-menu-item');
        if (menuItem && !menuItem.dataset.handled) {
          // Mark as handled to prevent duplicate calls
          menuItem.dataset.handled = 'true';
          
          const action = menuItem.getAttribute('data-action');
          console.log('Context menu action clicked:', action);
          
          switch(action) {
            case 'delete':
              window.deleteFile();
              break;
            case 'move':
              window.moveFile();
              break;
            case 'rename':
              window.renameFile();
              break;
          }
          
          // Reset the handled flag after a short delay
          setTimeout(() => {
            delete menuItem.dataset.handled;
          }, 100);
        }
      });
    }
    
    // Add click-outside-to-close functionality for dropdowns
    document.addEventListener('click', function(event) {
      // Vault dropdown
      const vaultDropdown = document.getElementById('vault-dropdown');
      const vaultMenuContainer = document.querySelector('.vault-menu-container');
      
      if (vaultDropdown && !vaultDropdown.classList.contains('hidden')) {
        if (!vaultMenuContainer?.contains(event.target)) {
          vaultDropdown.classList.add('hidden');
        }
      }
      
      // Editor dropdown
      const editorDropdown = document.getElementById('editor-dropdown');
      const editorMenuContainer = document.querySelector('.editor-menu-container');
      
      if (editorDropdown && !editorDropdown.classList.contains('hidden')) {
        if (!editorMenuContainer?.contains(event.target)) {
          editorDropdown.classList.add('hidden');
        }
      }
    });
    
    // Set up auto-save on window before unload
    window.addEventListener('beforeunload', async (e) => {
      if (currentEditor && currentEditor.hasUnsavedChanges && currentFile) {
        e.preventDefault();
        await saveCurrentFile();
      }
    });
    
  } else {
    console.error('❌ No #app element found');
  }
}

// Context Menu Functions
let contextMenuTarget = null;

window.showFileContextMenu = function(event, filePath) {
  const contextMenu = document.getElementById('file-context-menu');
  if (!contextMenu) return;
  
  // Hide any existing context menu first
  window.hideContextMenu();
  
  contextMenuTarget = filePath;
  
  // Position the menu at the mouse location
  contextMenu.style.left = event.clientX + 'px';
  contextMenu.style.top = event.clientY + 'px';
  contextMenu.classList.remove('hidden');
  
  // Prevent immediate closing by stopping propagation on the menu itself
  const stopProp = function(e) {
    e.stopPropagation();
  };
  contextMenu.addEventListener('mousedown', stopProp);
  contextMenu.addEventListener('mouseup', stopProp);
  contextMenu.addEventListener('click', stopProp);
  
  // Add listener to hide menu when clicking elsewhere
  // Small delay to ensure menu is fully rendered
  requestAnimationFrame(() => {
    const hideOnClick = function(e) {
      if (!contextMenu.contains(e.target)) {
        window.hideContextMenu();
        document.removeEventListener('mousedown', hideOnClick, true);
      }
    };
    document.addEventListener('mousedown', hideOnClick, true);
  });
}

window.hideContextMenu = function() {
  const contextMenu = document.getElementById('file-context-menu');
  if (contextMenu) {
    contextMenu.classList.add('hidden');
    // Don't clear contextMenuTarget here - let the action handlers do it
  }
}

window.deleteFile = async function() {
  if (!contextMenuTarget) return;
  
  const targetPath = contextMenuTarget; // Capture the path before async operation
  const fileName = targetPath.split('/').pop();
  
  // Use Tauri's dialog API for confirmation
  const confirmed = await ask(`Are you sure you want to delete "${fileName}"?`, {
    title: 'Delete File',
    type: 'warning'
  });
  
  if (confirmed) {
    invoke('delete_file', { filePath: targetPath })
      .then(async () => {
        console.log('File deleted successfully');
        
        // Close any tabs that have this file open
        if (tabManager) {
          console.log('Looking for tab with path:', targetPath);
          console.log('Current tabs:', Array.from(tabManager.tabs.values()).map(t => ({ id: t.id, path: t.filePath, title: t.title })));
          
          const tabToClose = tabManager.findTabByPath(targetPath);
          if (tabToClose) {
            console.log('Found tab to close:', tabToClose.id, tabToClose.filePath);
            tabManager.closeTab(tabToClose.id, true); // Force close without save prompt
          } else {
            console.log('No tab found for deleted file path:', targetPath);
          }
        }
        
        // Refresh file tree
        try {
          const fileTree = await invoke('get_file_tree');
          displayFileTree(fileTree);
        } catch (error) {
          console.error('Error refreshing file tree:', error);
        }
      })
      .catch(error => {
        console.error('Error deleting file:', error);
        alert('Error deleting file: ' + error);
      });
  }
  
  window.hideContextMenu();
  contextMenuTarget = null; // Clear after action completes
}

// Store move context globally
let moveContext = null;
let selectedFolderIndex = 0;
let availableFolders = [];

window.moveFile = function() {
  if (!contextMenuTarget) return;
  
  const fileName = contextMenuTarget.split('/').pop();
  
  moveContext = {
    targetPath: contextMenuTarget,
    fileName: fileName
  };
  
  // Hide the context menu
  window.hideContextMenu();
  contextMenuTarget = null;
  
  // Show the move modal
  const modal = document.getElementById('move-modal');
  const filter = document.getElementById('move-filter');
  
  if (modal && filter) {
    // Load folders and show modal
    loadFoldersForMove();
    modal.classList.remove('hidden');
    
    // Focus the filter input
    setTimeout(() => {
      filter.focus();
    }, 50);
  }
}

async function loadFoldersForMove() {
  try {
    // Get the file tree
    const fileTree = await invoke('get_file_tree');
    
    // Extract folders from the file tree
    availableFolders = [{
      path: '/',
      name: '/',
      display: '/'
    }];
    
    // Get unique folders
    const folderSet = new Set();
    fileTree.files.forEach(file => {
      if (file.is_dir) {
        folderSet.add(file.path);
      }
      // Also add parent directories
      if (file.parent_path) {
        folderSet.add(file.parent_path);
      }
    });
    
    // Convert to array and sort
    const folders = Array.from(folderSet).sort();
    folders.forEach(folder => {
      availableFolders.push({
        path: folder,
        name: folder.split('/').pop() || folder,
        display: folder
      });
    });
    
    // Display the folders
    displayFolders('');
    
  } catch (error) {
    console.error('Error loading folders:', error);
  }
}

function displayFolders(filterText) {
  const listEl = document.getElementById('move-folder-list');
  if (!listEl) return;
  
  // Filter folders based on search text
  const filtered = filterText ? 
    availableFolders.filter(f => 
      f.display.toLowerCase().includes(filterText.toLowerCase())
    ) : availableFolders;
  
  // Reset selection if needed
  if (selectedFolderIndex >= filtered.length) {
    selectedFolderIndex = 0;
  }
  
  // Build HTML
  let html = '';
  filtered.forEach((folder, index) => {
    const selected = index === selectedFolderIndex ? 'selected' : '';
    html += `
      <div class="move-folder-item ${selected}" data-path="${folder.path}" data-index="${index}">
        <span>${folder.display}</span>
      </div>
    `;
  });
  
  listEl.innerHTML = html;
  
  // Add click handlers
  listEl.querySelectorAll('.move-folder-item').forEach(item => {
    item.addEventListener('click', function() {
      const path = this.getAttribute('data-path');
      confirmMove(path);
    });
  });
}

window.closeMoveModal = function() {
  const modal = document.getElementById('move-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  moveContext = null;
  selectedFolderIndex = 0;
}

function confirmMove(destinationPath) {
  if (!moveContext) return;
  
  // Construct the new path
  const newPath = destinationPath === '/' ? 
    moveContext.fileName : 
    `${destinationPath}/${moveContext.fileName}`;
  
  console.log('Moving file:', moveContext.targetPath, '->', newPath);
  
  invoke('move_file', { 
    oldPath: moveContext.targetPath, 
    newPath: newPath 
  })
    .then(async () => {
      console.log('File moved successfully');
      // Refresh file tree
      try {
        const fileTree = await invoke('get_file_tree');
        displayFileTree(fileTree);
      } catch (error) {
        console.error('Error refreshing file tree:', error);
      }
    })
    .catch(error => {
      console.error('Error moving file:', error);
      alert('Error moving file: ' + error);
    });
  
  window.closeMoveModal();
}

async function createAndMoveToFolder(folderName) {
  if (!moveContext) return;
  
  try {
    // Create the new folder
    await invoke('create_new_folder', { folderName: folderName });
    
    // Move the file to the new folder
    confirmMove(folderName);
    
  } catch (error) {
    console.error('Error creating folder:', error);
    alert('Error creating folder: ' + error);
  }
}

// Store rename context globally
let renameContext = null;

window.renameFile = function() {
  console.log('renameFile called, contextMenuTarget:', contextMenuTarget);
  if (!contextMenuTarget) {
    console.error('No contextMenuTarget set');
    return;
  }
  
  // Store the rename context
  const pathParts = contextMenuTarget.split('/');
  const fileName = pathParts.pop();
  const directory = pathParts.join('/');
  
  renameContext = {
    targetPath: contextMenuTarget,
    fileName: fileName,
    directory: directory
  };
  
  // Hide the menu
  window.hideContextMenu();
  contextMenuTarget = null;
  
  // Show the rename modal
  const modal = document.getElementById('rename-modal');
  const input = document.getElementById('rename-input');
  
  if (modal && input) {
    input.value = fileName;
    modal.classList.remove('hidden');
    
    // Focus and select the filename (without extension)
    setTimeout(() => {
      input.focus();
      const lastDot = fileName.lastIndexOf('.');
      if (lastDot > 0) {
        input.setSelectionRange(0, lastDot);
      } else {
        input.select();
      }
    }, 50);
  }
}

window.closeRenameModal = function() {
  const modal = document.getElementById('rename-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  renameContext = null;
}

window.confirmRename = function() {
  if (!renameContext) return;
  
  const input = document.getElementById('rename-input');
  const newName = input.value.trim();
  
  if (newName && newName !== renameContext.fileName) {
    // Construct the new path properly
    const newPath = renameContext.directory ? 
      `${renameContext.directory}/${newName}` : newName;
    
    console.log('Renaming file:', renameContext.targetPath, '->', newPath);
    
    invoke('rename_file', { 
      oldPath: renameContext.targetPath, 
      newPath: newPath 
    })
      .then(async () => {
        console.log('File renamed successfully');
        // Refresh file tree
        try {
          const fileTree = await invoke('get_file_tree');
          displayFileTree(fileTree);
        } catch (error) {
          console.error('Error refreshing file tree:', error);
        }
      })
      .catch(error => {
        console.error('Error renaming file:', error);
        alert('Error renaming file: ' + error);
      });
  }
  
  window.closeRenameModal();
}

// Toggle AI Chat Panel
window.toggleChatPanel = function() {
  console.log('💬 Toggling AI Chat Panel...');
  
  // Enhanced debugging
  const chatBtn = document.getElementById('chat-toggle-btn');
  const rightSidebar = document.getElementById('right-sidebar');
  console.log('🔍 Chat button found:', !!chatBtn);
  console.log('🔍 Right sidebar found:', !!rightSidebar);
  console.log('🔍 Chat panel initialized:', !!chatPanel);
  
  if (!chatPanel) {
    console.error('❌ Chat panel not initialized');
    // Try to initialize it
    initializeChatPanel().then(() => {
      if (chatPanel) {
        console.log('✅ Chat panel initialized successfully, toggling...');
        chatPanel.toggle();
      }
    });
    return;
  }
  
  try {
    chatPanel.toggle();
    console.log('✅ Chat panel toggled');
  } catch (error) {
    console.error('❌ Error toggling chat panel:', error);
  }
};

// Add a manual test function
window.testChatPanel = function() {
  console.log('🧪 Testing chat panel...');
  const rightSidebar = document.getElementById('right-sidebar');
  const chatBtn = document.getElementById('chat-toggle-btn');
  
  console.log('🔍 Elements found:');
  console.log('- Right sidebar:', !!rightSidebar);
  console.log('- Chat button:', !!chatBtn);
  console.log('- Chat panel:', !!window.chatPanel);
  
  if (chatBtn) {
    chatBtn.style.backgroundColor = 'red';
    chatBtn.style.color = 'white';
    setTimeout(() => {
      chatBtn.style.backgroundColor = '';
      chatBtn.style.color = '';
    }, 2000);
    console.log('🔴 Chat button should flash red for 2 seconds');
  }
  
  if (rightSidebar) {
    console.log('✅ Right sidebar found, toggling...');
    rightSidebar.classList.toggle('visible');
    console.log('🔄 Toggled right sidebar visibility');
  } else {
    console.error('❌ Right sidebar not found');
  }
};

// Toggle split view
window.toggleSplitView = function() {
  console.log('🔀 Toggling split view');
  if (!paneManager) {
    console.error('❌ PaneManager not initialized');
    return;
  }
  
  if (paneManager.isSplit) {
    paneManager.unsplit();
    // Update button appearance
    const splitBtn = document.getElementById('split-view-btn');
    if (splitBtn) {
      splitBtn.classList.remove('active');
    }
  } else {
    paneManager.split();
    // Update button appearance
    const splitBtn = document.getElementById('split-view-btn');
    if (splitBtn) {
      splitBtn.classList.add('active');
    }
  }
};

// Sidebar toggle function
window.toggleSidebar = function() {
  console.log('🔽 Toggling sidebar...');
  const sidebar = document.querySelector('.sidebar');
  const editorContainer = document.querySelector('.editor-container');
  
  if (sidebar && editorContainer) {
    const isHidden = sidebar.style.display === 'none';
    
    if (isHidden) {
      // Show sidebar
      sidebar.style.display = 'flex';
      editorContainer.style.marginLeft = '0';
      console.log('📋 Sidebar shown');
    } else {
      // Hide sidebar
      sidebar.style.display = 'none';
      editorContainer.style.marginLeft = '0';
      console.log('📋 Sidebar hidden');
    }
  }
};

// Editor menu toggle function
window.toggleEditorMenu = function() {
  console.log('🔽 Toggling editor menu...');
  const dropdown = document.getElementById('editor-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
    console.log('📋 Editor menu visibility:', !dropdown.classList.contains('hidden'));
  }
};

// Show copy notification function
function showCopyNotification(message) {
  // Remove any existing notification
  const existingNotification = document.getElementById('copy-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'copy-notification';
  notification.className = 'copy-notification';
  notification.textContent = message;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Position it near the copy button
  const copyBtn = document.getElementById('copy-all-btn');
  if (copyBtn) {
    const btnRect = copyBtn.getBoundingClientRect();
    notification.style.position = 'fixed';
    notification.style.top = (btnRect.bottom + 8) + 'px';
    notification.style.right = '24px';
    notification.style.zIndex = '10000';
  }
  
  // Animate in
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 2000);
}

// Update word and character count
window.updateWordCount = function() {
  if (currentEditor) {
    const content = currentEditor.getContent();
    
    // Count words (split by whitespace and filter out empty strings)
    const words = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
    
    // Count characters (including spaces)
    const characters = content.length;
    
    // Update the UI
    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');
    
    if (wordCountEl) {
      wordCountEl.textContent = `${words.toLocaleString()} word${words === 1 ? '' : 's'}`;
    }
    
    if (charCountEl) {
      charCountEl.textContent = `${characters.toLocaleString()} character${characters === 1 ? '' : 's'}`;
    }
  }
}

// Copy all text function
window.copyAllText = function() {
  if (currentEditor) {
    try {
      // Get all text from the editor
      const allText = currentEditor.getContent();
      
      // Use the Clipboard API to copy text
      navigator.clipboard.writeText(allText).then(() => {
        console.log('✅ All text copied to clipboard');
        
        // Show success notification
        showCopyNotification('Copy successful');
        
        // Visual feedback - briefly change button appearance
        const copyBtn = document.getElementById('copy-all-btn');
        if (copyBtn) {
          copyBtn.classList.add('active');
          setTimeout(() => {
            copyBtn.classList.remove('active');
          }, 200);
        }
      }).catch(err => {
        console.error('❌ Failed to copy text:', err);
        
        // Fallback: select all text in editor for manual copy
        const view = currentEditor.view;
        view.dispatch({
          selection: { anchor: 0, head: view.state.doc.length }
        });
        view.focus();
      });
    } catch (error) {
      console.error('❌ Error copying text:', error);
    }
  } else {
    console.log('⚠️ No editor available to copy from');
  }
};

// Status bar toggle function
window.toggleStatusBar = function() {
  const statusBar = document.getElementById('editor-status-bar');
  const menuText = document.getElementById('status-bar-text');
  
  if (statusBar) {
    // Toggle global state
    statusBarVisible = !statusBarVisible;
    
    // Apply visibility
    statusBar.style.display = statusBarVisible ? 'flex' : 'none';
    
    // Update menu text
    if (menuText) {
      menuText.textContent = statusBarVisible ? 'Hide status bar' : 'Show status bar';
    }
    
    console.log('📊 Status bar', statusBarVisible ? 'shown' : 'hidden');
    
    // Hide dropdown after selection
    const dropdown = document.getElementById('editor-dropdown');
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
  }
};

// Export to PDF function
window.exportToPDF = async function() {
  console.log('📄 Exporting to PDF...');
  
  // Hide dropdown
  const dropdown = document.getElementById('editor-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
  
  if (!currentEditor || !currentFile) {
    console.error('❌ No editor or file available for export');
    showNotification('Please open a file before exporting', 'error');
    return;
  }
  
  try {
    // Get the markdown content
    const markdownContent = currentEditor.getContent();
    
    // Extract filename without extension for default export name
    const fileName = currentFile.split('/').pop().replace('.md', '');
    
    // Show save dialog
    const outputPath = await invoke('select_export_location', {
      fileName: fileName,
      extension: 'pdf'
    });
    
    if (!outputPath) {
      console.log('❌ Export cancelled by user');
      return;
    }
    
    console.log('📍 Export location selected:', outputPath);
    
    // Export to PDF
    await invoke('export_to_pdf', {
      markdownContent: markdownContent,
      outputPath: outputPath,
      options: {
        theme: 'light',
        include_styles: true,
        paper_size: 'A4'
      }
    });
    
    console.log('✅ PDF export completed successfully');
    showSuccess('PDF exported successfully');
    
  } catch (error) {
    console.error('❌ Failed to export PDF:', error);
    showNotification('Failed to export PDF: ' + error, 'error');
  }
};

// Export to HTML function
window.exportToHTML = async function() {
  console.log('📄 Exporting to HTML...');
  
  // Hide dropdown
  const dropdown = document.getElementById('editor-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
  
  if (!currentEditor || !currentFile) {
    console.error('❌ No editor or file available for export');
    showNotification('Please open a file before exporting', 'error');
    return;
  }
  
  try {
    // Get the markdown content
    const markdownContent = currentEditor.getContent();
    
    // Extract filename without extension for default export name
    const fileName = currentFile.split('/').pop().replace('.md', '');
    
    // Show save dialog
    const outputPath = await invoke('select_export_location', {
      fileName: fileName,
      extension: 'html'
    });
    
    if (!outputPath) {
      console.log('❌ Export cancelled by user');
      return;
    }
    
    console.log('📍 Export location selected:', outputPath);
    
    // Export to HTML
    await invoke('export_to_html', {
      markdownContent: markdownContent,
      outputPath: outputPath,
      options: {
        theme: 'light',
        include_styles: true,
        paper_size: null  // Not needed for HTML export
      }
    });
    
    console.log('✅ HTML export completed successfully');
    showSuccess('HTML exported successfully');
    
  } catch (error) {
    console.error('❌ Failed to export HTML:', error);
    showNotification('Failed to export HTML: ' + error, 'error');
  }
};

// Export to Word function
window.exportToWord = async function() {
  console.log('📄 Exporting to Word...');
  
  // Hide dropdown
  const dropdown = document.getElementById('editor-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
  
  if (!currentEditor || !currentFile) {
    console.error('❌ No editor or file available for export');
    showNotification('Please open a file before exporting', 'error');
    return;
  }
  
  try {
    // Get the markdown content
    const markdownContent = currentEditor.getContent();
    
    // Extract filename without extension for default export name
    const fileName = currentFile.split('/').pop().replace('.md', '');
    
    // Show save dialog
    const outputPath = await invoke('select_export_location', {
      fileName: fileName,
      extension: 'doc'
    });
    
    if (!outputPath) {
      console.log('❌ Export cancelled by user');
      return;
    }
    
    console.log('📍 Export location selected:', outputPath);
    
    // Export to Word
    await invoke('export_to_word', {
      markdownContent: markdownContent,
      outputPath: outputPath,
      options: {
        theme: 'light',
        include_styles: true,
        paper_size: null  // Not needed for Word export
      }
    });
    
    console.log('✅ Word export completed successfully');
    showSuccess('Word document exported successfully');
    
  } catch (error) {
    console.error('❌ Failed to export Word document:', error);
    showNotification('Failed to export Word document: ' + error, 'error');
  }
};

// Show success notification
function showSuccess(message) {
  showNotification(message, 'success');
}

// Generic notification function
function showNotification(message, type = 'info') {
  // Remove any existing notification
  const existingNotification = document.getElementById('export-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'export-notification';
  notification.className = `export-notification ${type}`;
  notification.textContent = message;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Position it at the top center
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.zIndex = '10000';
  
  // Animate in
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Generate highlights summary function
window.generateHighlightsSummary = function() {
  console.log('📝 Generating highlights summary...');
  
  // Hide dropdown
  const dropdown = document.getElementById('editor-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
  
  if (!currentEditor) {
    console.error('❌ No editor available');
    showNotification('Please open a file before generating highlights', 'error');
    return;
  }
  
  // Call the summarizeHighlightsCommand through the editor's view
  if (currentEditor.view) {
    currentEditor.view.dispatch({
      effects: [] // Trigger a no-op to ensure view is current
    });
    
    // Import and call the command
    import('./editor/highlights-extension.js').then(module => {
      const result = module.summarizeHighlights(currentEditor.view);
      
      // Show notification based on result
      if (result.success) {
        showNotification(result.message, 'success');
      } else {
        showNotification(result.message, 'info');
      }
    }).catch(error => {
      console.error('❌ Failed to load highlights extension:', error);
      showNotification('Failed to generate highlights summary', 'error');
    });
  } else {
    console.error('❌ Editor view not available');
    showNotification('Editor not ready, please try again', 'error');
  }
};

// Make showNotification available globally for the highlights extension
window.showNotification = showNotification;

// Zen mode state
let isZenMode = false;

// Zen mode toggle function
window.toggleZenMode = function() {
  console.log('🧘 Toggling zen mode...');
  
  const appContainer = document.querySelector('.app-container');
  const sidebar = document.querySelector('.sidebar');
  const rightSidebar = document.getElementById('right-sidebar');
  const editorHeader = document.getElementById('editor-header');
  const statusBar = document.getElementById('editor-status-bar');
  const editorContainer = document.querySelector('.editor-container');
  const menuText = document.getElementById('zen-mode-text');
  const dropdown = document.getElementById('editor-dropdown');
  
  isZenMode = !isZenMode;
  
  if (isZenMode) {
    // Enter zen mode
    console.log('🧘 Entering zen mode');
    
    // Hide UI elements
    if (sidebar) sidebar.style.display = 'none';
    if (rightSidebar) rightSidebar.style.display = 'none';
    if (editorHeader) editorHeader.style.display = 'none';
    if (statusBar) statusBar.style.display = 'none';
    
    // Expand editor to full screen
    if (editorContainer) {
      editorContainer.style.margin = '0';
      editorContainer.style.height = '100vh';
      editorContainer.style.width = '100vw';
    }
    
    // Add zen mode class for additional styling
    if (appContainer) appContainer.classList.add('zen-mode');
    
    // Update menu text
    if (menuText) menuText.textContent = 'Exit zen mode';
    
    // Focus the editor
    if (currentEditor && currentEditor.view) {
      currentEditor.view.focus();
    }
  } else {
    // Exit zen mode
    console.log('🧘 Exiting zen mode');
    
    // Restore UI elements
    if (sidebar) sidebar.style.display = 'flex';
    if (editorHeader) editorHeader.style.display = 'flex';
    // Restore status bar based on global state
    if (statusBar && statusBarVisible) statusBar.style.display = 'flex';
    
    // Restore right sidebar if it was visible before zen mode
    if (rightSidebar && chatPanel && chatPanel.isVisible) {
      rightSidebar.style.display = 'flex';
    }
    
    // Reset editor container styles
    if (editorContainer) {
      editorContainer.style.margin = '';
      editorContainer.style.height = '';
      editorContainer.style.width = '';
    }
    
    // Remove zen mode class
    if (appContainer) appContainer.classList.remove('zen-mode');
    
    // Update menu text
    if (menuText) menuText.textContent = 'Enter zen mode';
  }
  
  // Hide dropdown after selection
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
};

// Line numbers toggle function
window.toggleLineNumbers = function() {
  if (currentEditor) {
    const isEnabled = currentEditor.toggleLineNumbers();
    
    // Update menu text
    const menuText = document.getElementById('line-numbers-text');
    if (menuText) {
      menuText.textContent = isEnabled ? 'Hide lines' : 'Show lines';
    }
    
    // Hide dropdown after selection
    const dropdown = document.getElementById('editor-dropdown');
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
    
    console.log('Line numbers toggled:', isEnabled ? 'on' : 'off');
  }
}

// Global test function for debugging message serialization
window.testMessageSerialization = async function() {
  console.log('🧪 Testing message serialization...');
  
  try {
    // Test 1: Simple array of messages
    const testMessages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' }
    ];
    
    console.log('📤 Sending test messages:', testMessages);
    console.log('📊 Messages JSON:', JSON.stringify(testMessages));
    
    const result = await invoke('test_messages', {
      messages: testMessages
    });
    
    console.log('✅ Test result:', result);
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return error;
  }
}

// Debug test for send_ai_chat
window.debugSendAIChat = async function() {
  console.log('🐛 Testing debug_send_ai_chat...');
  
  try {
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Test message' }
    ];
    
    console.log('📤 Sending to debug command:', messages);
    
    const result = await invoke('debug_send_ai_chat', {
      messages: messages
    });
    
    console.log('✅ Debug result:', result);
    return result;
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return error;
  }
}

// Another test function that uses the actual send_ai_chat command
window.testAIChat = async function() {
  console.log('🤖 Testing AI chat command...');
  
  try {
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant.'
      },
      {
        role: 'user',
        content: 'Hello, this is a test message.'
      }
    ];
    
    console.log('📤 Sending messages to AI:', messages);
    console.log('📊 Stringified:', JSON.stringify(messages));
    
    const response = await invoke('send_ai_chat', {
      messages: messages
    });
    
    console.log('✅ AI response:', response);
    return response;
  } catch (error) {
    console.error('❌ AI chat test failed:', error);
    throw error;
  }
}

// Test with different serialization approaches
window.testAIChatAlternative = async function() {
  console.log('🧪 Testing alternative serialization...');
  
  try {
    // Try 1: Direct array construction
    const messages = [];
    messages.push({
      role: 'system',
      content: 'You are a helpful AI assistant.'
    });
    messages.push({
      role: 'user', 
      content: 'Hello, this is a test message.'
    });
    
    console.log('📤 Method 1 - Direct array:', messages);
    
    // Try 2: JSON parse/stringify roundtrip
    const messagesJson = JSON.stringify(messages);
    const messagesParsed = JSON.parse(messagesJson);
    
    console.log('📤 Method 2 - JSON roundtrip:', messagesParsed);
    
    // Try 3: Spread operator
    const messagesSpread = [...messages];
    
    console.log('📤 Method 3 - Spread:', messagesSpread);
    
    // Test each method
    console.log('Testing method 1...');
    try {
      const r1 = await invoke('send_ai_chat', { messages: messages });
      console.log('✅ Method 1 worked:', r1);
    } catch (e) {
      console.error('❌ Method 1 failed:', e);
    }
    
    console.log('Testing method 2...');
    try {
      const r2 = await invoke('send_ai_chat', { messages: messagesParsed });
      console.log('✅ Method 2 worked:', r2);
    } catch (e) {
      console.error('❌ Method 2 failed:', e);
    }
    
    console.log('Testing method 3...');
    try {
      const r3 = await invoke('send_ai_chat', { messages: messagesSpread });
      console.log('✅ Method 3 worked:', r3);
    } catch (e) {
      console.error('❌ Method 3 failed:', e);
    }
    
  } catch (error) {
    console.error('❌ Alternative test failed:', error);
    throw error;
  }
}

// Initialize chat resize functionality
function initializeChatResize() {
  const resizeHandle = document.getElementById('chat-resize-handle');
  const rightSidebar = document.getElementById('right-sidebar');
  
  if (!resizeHandle || !rightSidebar) {
    console.log('❌ Chat resize elements not found');
    return;
  }
  
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = rightSidebar.offsetWidth;
    resizeHandle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.classList.add('resizing-chat');
    
    // Prevent text selection while dragging
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    // Calculate new width (dragging left makes it wider)
    const deltaX = startX - e.clientX;
    const newWidth = Math.min(Math.max(startWidth + deltaX, 250), 600);
    
    // Apply the new width
    rightSidebar.style.width = newWidth + 'px';
    
    // Store the width preference
    if (rightSidebar.classList.contains('visible')) {
      localStorage.setItem('chatPanelWidth', newWidth);
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizeHandle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.classList.remove('resizing-chat');
    }
  });
  
  // Restore saved width if available
  const savedWidth = localStorage.getItem('chatPanelWidth');
  if (savedWidth && rightSidebar.classList.contains('visible')) {
    rightSidebar.style.width = savedWidth + 'px';
  }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎯 DOM loaded - Starting initialization...');
  await initializeApp();
  initializeChatResize();
  
  // Add global click handler to close dropdowns
  document.addEventListener('click', (e) => {
    // Close dropdowns if clicking outside
    const vaultDropdown = document.getElementById('vault-dropdown');
    const sortDropdown = document.getElementById('sort-dropdown');
    const vaultMenu = document.getElementById('vault-menu');
    const sortMenu = document.getElementById('sort-menu');
    
    // Check if click is on menu button or its children
    const clickedVaultMenu = vaultMenu && (vaultMenu.contains(e.target) || e.target === vaultMenu);
    const clickedSortMenu = sortMenu && (sortMenu.contains(e.target) || e.target === sortMenu);
    
    if (vaultDropdown && !vaultDropdown.contains(e.target) && !clickedVaultMenu) {
      vaultDropdown.classList.add('hidden');
    }
    
    if (sortDropdown && !sortDropdown.contains(e.target) && !clickedSortMenu) {
      sortDropdown.classList.add('hidden');
    }
  });
});

// Also try immediate execution in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
  console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
} else {
  console.log('⚡ DOM already ready, executing immediately...');
  initializeApp();
}