// Tauri v2 Modern Approach - Import APIs explicitly
console.log('🚀 TAURI V2 APPROACH - Loading...');

// Import Tauri v2 APIs the modern way
import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

console.log('✅ Tauri v2 APIs imported successfully!');
console.log('🔍 invoke function:', typeof tauriInvoke);
console.log('🔍 dialog open function:', typeof open);

// Global state for expanded folders
window.expandedFolders = new Set();

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

// Simple initialization - no complex waiting needed with Tauri v2
async function initTauri() {
  console.log('🚀 Tauri v2: Ready to use!');
  console.log('✅ invoke function type:', typeof tauriInvoke);
  console.log('✅ dialog open function type:', typeof open);
}

// Vault name prompt modal
async function promptForVaultName() {
  return new Promise((resolve) => {
    // Create modal HTML
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
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('vault-name-modal');
    const input = document.getElementById('vault-name-input');
    const cancelBtn = document.getElementById('vault-cancel-btn');
    const createBtn = document.getElementById('vault-create-btn');
    
    // Focus and select text
    setTimeout(() => {
      console.log('🔍 Focusing input field...');
      input.focus();
      input.select();
      console.log('✅ Input focused and selected. Value:', input.value);
      
      // Add input event to verify typing works
      input.addEventListener('input', (e) => {
        console.log('⌨️ Input changed to:', e.target.value);
      });
    }, 100);
    
    // Handle create button
    createBtn.onclick = () => {
      const name = input.value.trim();
      console.log('🆕 Creating vault with name:', name);
      modal.remove();
      resolve(name);
    };
    
    // Handle cancel button
    cancelBtn.onclick = () => {
      modal.remove();
      resolve(null);
    };
    
    // Handle Enter key
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createBtn.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelBtn.click();
      }
    };
    
    // Handle click outside modal
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
    
    // Expand the parent folder if creating inside a folder
    if (folderPath) {
      window.expandedFolders.add(folderPath);
    }
    
    // Refresh file tree
    refreshFileTree();
    
    // Open the new file
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
    
    // Refresh file tree
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
      // Auto-add .md extension if not provided
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
  
  // Hide the dropdown first
  const dropdown = document.getElementById('vault-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
  
  // Reset vault state (we'll implement vault closing in backend later)
  const vaultNameEl = document.querySelector('.vault-name');
  if (vaultNameEl) {
    vaultNameEl.textContent = 'No Vault';
  }
  
  // Reset file tree
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
  
  // Reset editor
  const editor = document.getElementById('editor');
  if (editor) {
    editor.innerHTML = `
      <div class="welcome-screen">
        <h1>Welcome to Aura</h1>
        <p>Open or create a vault to start managing your knowledge.</p>
        <div class="features">
          <div class="feature">
            <h3>📁 Local Files</h3>
            <p>Your notes are stored as plain Markdown files on your computer.</p>
          </div>
          <div class="feature">
            <h3>🔒 Private</h3>
            <p>No telemetry, no cloud sync unless you choose it.</p>
          </div>
          <div class="feature">
            <h3>⚡ Fast</h3>
            <p>Native performance with a lightweight design.</p>
          </div>
        </div>
      </div>
    `;
  }
  
  const editorHeader = document.getElementById('editor-header');
  if (editorHeader) {
    editorHeader.innerHTML = `<span class="file-name">Welcome to Aura</span>`;
  }
};

// Global functions for vault management
window.openVault = async function() {
  console.log('🎯 Opening vault...');
  
  // Close dropdown if open
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
    
    // Step 1: Select folder using Tauri v2 dialog
    console.log('📁 Opening folder selection dialog...');
    const folderPath = await open({
      directory: true,
      multiple: false
    });
    
    console.log('🔍 Raw folder path response:', folderPath, 'Type:', typeof folderPath);
    
    if (!folderPath) {
      console.log('❌ No folder selected');
      return;
    }
    
    console.log('📂 Selected folder:', folderPath);
    
    // Step 2: Open vault
    if (btn) btn.textContent = 'Opening...';
    const vaultInfo = await invoke('open_vault', { path: folderPath });
    
    console.log('🔍 Vault info response:', vaultInfo);
    
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
  
  // Close dropdown if open
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
    
    // Step 1: Select parent directory where vault will be created
    console.log('📁 Opening directory selection dialog...');
    const parentPath = await open({
      directory: true,
      multiple: false,
      title: 'Select directory where vault will be created'
    });
    
    console.log('🔍 Raw parent path response:', parentPath, 'Type:', typeof parentPath);
    
    if (!parentPath) {
      console.log('❌ No parent folder selected');
      return;
    }
    
    console.log('📂 Selected parent folder:', parentPath);
    
    // Step 2: Get vault name using custom modal
    console.log('📝 Prompting for vault name...');
    const vaultName = await promptForVaultName();
    if (!vaultName || vaultName.trim() === '') {
      console.log('❌ No vault name provided');
      return;
    }
    
    console.log('📝 Vault name:', vaultName);
    
    // Step 3: Create vault
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
  
  // Update vault name in sidebar
  const vaultNameEl = document.querySelector('.vault-name');
  if (vaultNameEl) {
    vaultNameEl.textContent = vaultInfo.name;
  }
  
  // Load and display file tree
  try {
    console.log('📁 Loading file tree...');
    const fileTree = await invoke('get_file_tree');
    console.log('📊 File tree loaded:', fileTree);
    
    displayFileTree(fileTree);
  } catch (error) {
    console.error('❌ Failed to load file tree:', error);
    showFileTreeError(error);
  }
  
  // Update editor with welcome message
  const editor = document.getElementById('editor');
  if (editor) {
    editor.innerHTML = `
      <div class="vault-success">
        <h1>🎉 Vault Ready!</h1>
        <h2>${vaultInfo.name}</h2>
        <p>Your vault is now open and ready to use.</p>
        <p><strong>Location:</strong> <code>${vaultInfo.path}</code></p>
        <p><em>Click on any file in the sidebar to start editing!</em></p>
      </div>
    `;
  }
}

function displayFileTree(fileTree) {
  console.log('🌲 Displaying file tree with', fileTree.files.length, 'items');
  console.log('📊 File tree data:', fileTree);
  
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
  
  // Sort files: hierarchical order with folders and their contents grouped
  const sortedFiles = [...fileTree.files].sort((a, b) => {
    // First, sort by path depth and hierarchy 
    const aPathParts = a.path.split('/');
    const bPathParts = b.path.split('/');
    
    // Compare each path segment
    for (let i = 0; i < Math.max(aPathParts.length, bPathParts.length); i++) {
      const aPart = aPathParts[i] || '';
      const bPart = bPathParts[i] || '';
      
      if (aPart !== bPart) {
        // If one path is shorter, it comes first (parent comes before children)
        if (!aPart) return -1;
        if (!bPart) return 1;
        
        // Compare the path segments alphabetically
        return aPart.localeCompare(bPart);
      }
    }
    
    // If paths are the same up to this point, directories come before files
    if (a.is_dir !== b.is_dir) {
      return a.is_dir ? -1 : 1;
    }
    
    return 0;
  });
  
  console.log('📋 Sorted file order:', sortedFiles.map(f => f.path));
  
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
    console.log('📄 Processing file item:', file);
    console.log('   📍 Parent path:', file.parent_path, 'Depth:', file.depth);
    console.log('   🔍 Expanded folders:', Array.from(window.expandedFolders));
    
    // Skip files that are inside collapsed folders
    if (file.parent_path && !window.expandedFolders.has(file.parent_path)) {
      console.log('   ⏭️ Skipping - parent folder collapsed');
      return;
    }
    
    const indent = file.depth * 20;
    const isExpanded = window.expandedFolders.has(file.path);
    
    console.log('   🎨 Indent calculation: depth=' + file.depth + ' * 20 = ' + indent + 'px');
    
    if (file.is_dir) {
      console.log('   📁 FOLDER: Final padding-left = ' + (indent + 8) + 'px');
    } else {
      const fileIndent = indent + 24;
      console.log('   📄 FILE: Final padding-left = ' + fileIndent + 'px');
    }
    
    if (file.is_dir) {
      // Folder item with expand/collapse button
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
      // File item - should be indented more than its parent folder
      const escapedPath = file.path.replace(/'/g, "\\'").replace(/"/g, "&quot;");
      const fileIndent = indent + 24; // Base folder indent + icon space + margin
      
      html += `
        <div class="tree-item file" data-path="${file.path}" style="padding-left: ${fileIndent}px;" onclick="handleFileClick('${escapedPath}', false)">
          <span class="tree-icon">📄</span>
          <span class="tree-label">${file.name}</span>
        </div>
      `;
    }
  });
  
  html += '</div></div>'; // Close both file-tree-content and wrapper
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
  
  // Refresh the file tree display
  refreshFileTree();
};

// Handle folder clicks (different from toggle)
window.handleFolderClick = function(folderPath, event) {
  event.stopPropagation();
  console.log('📁 Folder clicked:', folderPath);
  // For now, just toggle the folder
  window.toggleFolder(folderPath, event);
};

// Refresh file tree without backend call
async function refreshFileTree() {
  try {
    const fileTree = await invoke('get_file_tree');
    displayFileTree(fileTree);
  } catch (error) {
    console.error('❌ Failed to refresh file tree:', error);
  }
}

// Handle file/folder clicks (make it global for onclick)
window.handleFileClick = async function(filePath, isDir) {
  console.log('🔍 File clicked:', filePath, 'isDir:', isDir);
  
  if (isDir) {
    // For now, just show a message for directories
    console.log('📁 Directory clicked - not implemented yet');
    return;
  }
  
  try {
    console.log('📖 Reading file:', filePath);
    const content = await invoke('read_file_content', { filePath: filePath });
    console.log('📄 File content loaded, length:', content.length);
    
    displayFileContent(filePath, content);
  } catch (error) {
    console.error('❌ Failed to read file:', error);
    showError('Failed to load file: ' + error);
  }
};

function displayFileContent(filePath, content) {
  console.log('📝 Displaying file content for:', filePath);
  
  // Update editor header
  const editorHeader = document.getElementById('editor-header');
  if (editorHeader) {
    editorHeader.innerHTML = `<span class="file-name">${filePath}</span>`;
  }
  
  // Update editor with content
  const editor = document.getElementById('editor');
  if (editor) {
    editor.innerHTML = `
      <div class="markdown-editor">
        <textarea id="markdown-content" placeholder="Start writing your markdown...">${content}</textarea>
      </div>
    `;
    
    // Add basic auto-save functionality
    const textarea = document.getElementById('markdown-content');
    if (textarea) {
      let saveTimeout;
      textarea.addEventListener('input', () => {
        // Debounce saving
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          saveFile(filePath, textarea.value);
        }, 1000);
      });
    }
  }
}

async function saveFile(filePath, content) {
  try {
    console.log('💾 Saving file:', filePath);
    await invoke('write_file_content', { filePath: filePath, content: content });
    console.log('✅ File saved successfully');
  } catch (error) {
    console.error('❌ Failed to save file:', error);
    showError('Failed to save file: ' + error);
  }
}

function showError(message) {
  console.error('🚨 Showing error:', message);
  
  // Simple error display - could be improved with better UI
  const editor = document.getElementById('editor');
  if (editor) {
    editor.innerHTML = `
      <div class="error-message">
        <h2>❌ Error</h2>
        <p>${message}</p>
        <button onclick="location.reload()">Reload App</button>
      </div>
    `;
  }
}

// Initialize everything properly
async function initializeApp() {
  console.log('🎯 Starting app initialization...');
  console.log('🔍 Pre-init window.__TAURI__:', window.__TAURI__);
  
  // First, wait for Tauri to be ready
  await initTauri();
  
  console.log('🎯 Post-init invoke type:', typeof invoke);
  
  // Then render the UI
  const appElement = document.querySelector('#app');
  console.log('🔍 App element:', appElement);
  console.log('🔍 Document body:', document.body);
  console.log('🔍 All elements:', document.querySelectorAll('*').length);
  
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
          <div class="editor" id="editor">
            <div class="welcome-screen">
              <h1>Welcome to Aura</h1>
              <p>Open or create a vault to start managing your knowledge.</p>
              <div class="features">
                <div class="feature">
                  <h3>📁 Local Files</h3>
                  <p>Your notes are stored as plain Markdown files on your computer.</p>
                </div>
                <div class="feature">
                  <h3>🔒 Private</h3>
                  <p>No telemetry, no cloud sync unless you choose it.</p>
                </div>
                <div class="feature">
                  <h3>⚡ Fast</h3>
                  <p>Native performance with a lightweight design.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    console.log('✅ Aura UI HTML set successfully with inline onclick!');
    console.log('🔍 Final app innerHTML length:', appElement.innerHTML.length);
    
    // Add click-outside-to-close functionality for vault dropdown
    document.addEventListener('click', function(event) {
      const dropdown = document.getElementById('vault-dropdown');
      const menuButton = document.getElementById('vault-menu');
      const menuContainer = document.querySelector('.vault-menu-container');
      
      if (dropdown && !dropdown.classList.contains('hidden')) {
        // Check if click was outside the menu container
        if (!menuContainer?.contains(event.target)) {
          dropdown.classList.add('hidden');
          console.log('📋 Dropdown closed by outside click');
        }
      }
    });
    
  } else {
    console.error('❌ No #app element found');
    console.error('🔍 Available elements:', Array.from(document.querySelectorAll('*')).map(el => el.tagName));
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