// Tauri v2 Modern Approach with CodeMirror Editor Integration
console.log('🚀 TAURI V2 APPROACH WITH EDITOR - Loading...');

// Import Tauri v2 APIs and editor components
import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { MarkdownEditor } from './editor/markdown-editor.js';
import { ThemeManager } from './editor/theme-manager.js';
import { markdownExtensions, markdownStyles } from './editor/markdown-extensions.js';

console.log('✅ Tauri v2 APIs and editor components imported successfully!');

// Global state
window.expandedFolders = new Set();
let currentEditor = null;
let currentThemeManager = null;
let currentFile = null;

// Use the imported Tauri v2 functions directly
async function invoke(command, args = {}) {
  console.log(`🔧 Tauri v2: Invoking ${command} with args:`, args);
  try {
    return await tauriInvoke(command, args);
  } catch (error) {
    console.error(`❌ Tauri invoke failed for ${command}:`, error);
    throw error;
  }
}

// Initialize CodeMirror editor
async function initializeEditor() {
  const editorContainer = document.getElementById('editor-container');
  if (!editorContainer) {
    console.error('❌ Editor container not found');
    return;
  }

  // Create the editor
  currentEditor = new MarkdownEditor(editorContainer);
  currentThemeManager = new ThemeManager(currentEditor);
  
  // Add markdown extensions
  currentEditor.view.dispatch({
    effects: currentEditor.view.state.compartment.reconfigure([
      markdownExtensions,
      markdownStyles
    ])
  });

  // Load user preferences
  await loadEditorPreferences();
  
  console.log('✅ CodeMirror editor initialized');
}

async function loadEditorPreferences() {
  try {
    const prefs = await invoke('get_editor_preferences');
    
    // Apply theme
    currentThemeManager.applyTheme(prefs.theme);
    
    // Apply font size
    currentEditor.view.dispatch({
      effects: currentEditor.fontSizeCompartment.reconfigure(
        currentEditor.createFontSizeTheme(prefs.font_size)
      )
    });
    
    // Apply line wrapping
    if (!prefs.line_wrapping) {
      currentEditor.view.dispatch({
        effects: currentEditor.lineWrappingCompartment.reconfigure([])
      });
    }
    
    console.log('✅ Editor preferences loaded');
  } catch (error) {
    console.error('❌ Failed to load editor preferences:', error);
  }
}

// Simple initialization - no complex waiting needed with Tauri v2
async function initTauri() {
  console.log('🚀 Tauri v2: Ready to use!');
  console.log('✅ invoke function type:', typeof tauriInvoke);
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
  if (dropdown) {
    dropdown.classList.toggle('hidden');
    console.log('📋 Menu visibility:', !dropdown.classList.contains('hidden'));
  }
};

window.closeCurrentVault = async function() {
  console.log('❌ Closing current vault...');
  
  const dropdown = document.getElementById('vault-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
  
  const vaultNameEl = document.querySelector('.vault-name');
  if (vaultNameEl) {
    vaultNameEl.textContent = 'No Vault';
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
  
  // Reset editor to welcome screen
  if (currentEditor) {
    currentEditor.setContent('');
    currentFile = null;
  }
  
  const editorHeader = document.getElementById('editor-header');
  if (editorHeader) {
    editorHeader.innerHTML = `<span class="file-name">Welcome to Aura</span>`;
  }
  
  // Show welcome screen
  showWelcomeScreen();
};

// Show welcome screen in editor
function showWelcomeScreen() {
  if (currentEditor) {
    const welcomeContent = `# Welcome to Aura

Open or create a vault to start managing your knowledge.

## Features

### 📁 Local Files
Your notes are stored as plain Markdown files on your computer.

### 🔒 Private
No telemetry, no cloud sync unless you choose it.

### ⚡ Fast
Native performance with a lightweight design.

## Getting Started

1. Click "Open Vault" to select an existing folder with markdown files
2. Click "Create Vault" to create a new vault in a folder of your choice
3. Start writing in markdown with features like [[wiki links]] and #tags
`;
    
    currentEditor.setContent(welcomeContent);
    currentFile = null;
  }
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
  
  const vaultNameEl = document.querySelector('.vault-name');
  if (vaultNameEl) {
    vaultNameEl.textContent = vaultInfo.name;
  }
  
  try {
    console.log('📁 Loading file tree...');
    const fileTree = await invoke('get_file_tree');
    console.log('📊 File tree loaded:', fileTree);
    
    displayFileTree(fileTree);
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
  
  const fileTreeElement = document.getElementById('file-tree');
  if (!fileTreeElement) {
    console.error('❌ File tree element not found');
    return;
  }
  
  if (fileTree.files.length === 0) {
    fileTreeElement.innerHTML = `
      <div class="file-tree-header">
        <span class="tree-header-title">Files</span>
        <div class="tree-actions">
          <button class="tree-action-btn" onclick="showCreateFileModal('')" title="New File">📄</button>
          <button class="tree-action-btn" onclick="showCreateFolderModal('')" title="New Folder">📁</button>
        </div>
      </div>
      <div class="empty-vault">
        <p>📁 Vault is empty</p>
        <p><em>Create your first note to get started!</em></p>
      </div>
    `;
    return;
  }
  
  // Sort files hierarchically
  const sortedFiles = [...fileTree.files].sort((a, b) => {
    const aPathParts = a.path.split('/');
    const bPathParts = b.path.split('/');
    
    for (let i = 0; i < Math.max(aPathParts.length, bPathParts.length); i++) {
      const aPart = aPathParts[i] || '';
      const bPart = bPathParts[i] || '';
      
      if (aPart !== bPart) {
        if (!aPart) return -1;
        if (!bPart) return 1;
        return aPart.localeCompare(bPart);
      }
    }
    
    if (a.is_dir !== b.is_dir) {
      return a.is_dir ? -1 : 1;
    }
    
    return 0;
  });
  
  let html = `
    <div class="file-tree-header">
      <span class="tree-header-title">Files</span>
      <div class="tree-actions">
        <button class="tree-action-btn" onclick="showCreateFileModal('')" title="New File">📄</button>
        <button class="tree-action-btn" onclick="showCreateFolderModal('')" title="New Folder">📁</button>
      </div>
    </div>
    <div class="file-tree-content">
  `;
  
  sortedFiles.forEach(file => {
    if (file.parent_path && !window.expandedFolders.has(file.parent_path)) {
      return;
    }
    
    const indent = file.depth * 20;
    const isExpanded = window.expandedFolders.has(file.path);
    
    if (file.is_dir) {
      const expandIcon = isExpanded ? '▼' : '▶';
      const escapedPath = file.path.replace(/'/g, "\\'").replace(/"/g, "&quot;");
      
      html += `
        <div class="tree-item folder" data-path="${file.path}" style="padding-left: ${indent + 8}px;">
          <span class="expand-icon" onclick="toggleFolder('${escapedPath}', event)">${expandIcon}</span>
          <span class="tree-icon" onclick="handleFolderClick('${escapedPath}', event)">📁</span>
          <span class="tree-label" onclick="handleFolderClick('${escapedPath}', event)">${file.name}</span>
          <span class="folder-actions">
            <button class="folder-action-btn" onclick="showCreateFileModal('${escapedPath}', event)" title="New File in Folder">📄</button>
          </span>
        </div>
      `;
    } else {
      const escapedPath = file.path.replace(/'/g, "\\'").replace(/"/g, "&quot;");
      const fileIndent = indent + 24;
      
      html += `
        <div class="tree-item file" data-path="${file.path}" style="padding-left: ${fileIndent}px;" onclick="handleFileClick('${escapedPath}', false)">
          <span class="tree-icon">📄</span>
          <span class="tree-label">${file.name}</span>
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

// Handle file clicks with CodeMirror editor
window.handleFileClick = async function(filePath, isDir) {
  console.log('🔍 File clicked:', filePath, 'isDir:', isDir);
  
  if (isDir) {
    console.log('📁 Directory clicked - not implemented yet');
    return;
  }
  
  try {
    console.log('📖 Reading file:', filePath);
    
    // Save current file if there are unsaved changes
    if (currentEditor && currentEditor.hasUnsavedChanges && currentFile) {
      await saveCurrentFile();
    }
    
    const content = await invoke('read_file_content', { filePath: filePath });
    console.log('📄 File content loaded, length:', content.length);
    
    // Update editor
    currentEditor.setContent(content);
    currentEditor.currentFile = filePath;
    currentFile = filePath;
    
    // Update UI
    const editorHeader = document.getElementById('editor-header');
    if (editorHeader) {
      editorHeader.innerHTML = `<span class="file-name">${filePath}</span>`;
    }
    
    // Focus the editor
    currentEditor.focus();
    
  } catch (error) {
    console.error('❌ Failed to read file:', error);
    showError('Failed to load file: ' + error);
  }
};

// Save current file
async function saveCurrentFile() {
  if (!currentEditor || !currentFile) {
    return;
  }
  
  try {
    console.log('💾 Saving file:', currentFile);
    const content = currentEditor.getContent();
    await invoke('write_file_content', { filePath: currentFile, content: content });
    currentEditor.hasUnsavedChanges = false;
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
  console.log('🎯 Starting app initialization...');
  
  await initTauri();
  
  const appElement = document.querySelector('#app');
  
  if (appElement) {
    console.log('📝 Setting innerHTML...');
    appElement.innerHTML = `
      <div class="app-container">
        <div class="sidebar">
          <div class="sidebar-header">
            <h2 class="vault-name">No Vault</h2>
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
          <div class="file-tree" id="file-tree">
            <div class="empty-state">
              <p>No vault open</p>
              <button id="open-vault" class="primary-button" onclick="window.openVault()">Open Vault</button>
              <button id="create-vault" class="secondary-button" onclick="window.createVault()">Create Vault</button>
            </div>
          </div>
        </div>
        <div class="editor-container">
          <div class="editor-header" id="editor-header">
            <span class="file-name">Welcome to Aura</span>
          </div>
          <div id="editor-container" class="editor"></div>
        </div>
      </div>
    `;
    
    console.log('✅ UI HTML set successfully');
    
    // Initialize CodeMirror editor
    await initializeEditor();
    
    // Show welcome screen
    showWelcomeScreen();
    
    // Add click-outside-to-close functionality for vault dropdown
    document.addEventListener('click', function(event) {
      const dropdown = document.getElementById('vault-dropdown');
      const menuContainer = document.querySelector('.vault-menu-container');
      
      if (dropdown && !dropdown.classList.contains('hidden')) {
        if (!menuContainer?.contains(event.target)) {
          dropdown.classList.add('hidden');
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

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎯 DOM loaded - Starting initialization...');
  await initializeApp();
});

// Also try immediate execution in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
  console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
} else {
  console.log('⚡ DOM already ready, executing immediately...');
  initializeApp();
}