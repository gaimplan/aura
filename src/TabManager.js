import { MarkdownEditor } from './editor/markdown-editor.js';

/**
 * TabManager handles multiple editor tabs with support for future split views
 */
export class TabManager {
    constructor() {
        this.tabs = new Map(); // tabId -> Tab object
        this.activeTabId = null;
        this.tabOrder = []; // Array of tabIds in display order
        this.maxTabs = 5;
        this.nextTabId = 1;
        
        // Future-proofing for split views
        this.panes = [{
            id: 'main',
            tabIds: [], // Tabs in this pane
            activeTabId: null
        }];
        
        this.listeners = {
            'tab-changed': [],
            'tab-closed': [],
            'tab-created': [],
            'tabs-reordered': []
        };
    }
    
    /**
     * Create a new tab
     * @param {string} filePath - Path to the file (null for new untitled tab)
     * @param {string} content - Initial content
     * @returns {string} tabId
     */
    createTab(filePath = null, content = '') {
        if (this.tabs.size >= this.maxTabs) {
            throw new Error(`Maximum ${this.maxTabs} tabs allowed`);
        }
        
        const tabId = `tab-${this.nextTabId++}`;
        const editorContainer = document.createElement('div');
        editorContainer.className = 'tab-editor-container';
        editorContainer.style.display = 'none';
        editorContainer.dataset.tabId = tabId;
        
        const editor = new MarkdownEditor(editorContainer);
        
        const tab = {
            id: tabId,
            filePath,
            title: filePath ? filePath.split('/').pop() : 'Untitled',
            editor,
            editorContainer,
            isDirty: false,
            content: content
        };
        
        this.tabs.set(tabId, tab);
        this.tabOrder.push(tabId);
        this.panes[0].tabIds.push(tabId);
        
        if (content) {
            editor.setContent(content);
            editor.currentFile = filePath;
        } else if (!filePath) {
            // Show new tab screen for untitled tabs
            import('./NewTabScreen.js').then(module => {
                new module.NewTabScreen(editorContainer);
            });
        }
        
        this.emit('tab-created', { tabId, tab });
        return tabId;
    }
    
    /**
     * Activate a tab
     * @param {string} tabId
     */
    activateTab(tabId) {
        if (!this.tabs.has(tabId)) {
            throw new Error(`Tab ${tabId} not found`);
        }
        
        const previousTabId = this.activeTabId;
        
        // Hide previous tab
        if (previousTabId && this.tabs.has(previousTabId)) {
            const prevTab = this.tabs.get(previousTabId);
            prevTab.editorContainer.style.display = 'none';
        }
        
        // Show new tab
        const tab = this.tabs.get(tabId);
        tab.editorContainer.style.display = 'block';
        
        this.activeTabId = tabId;
        this.panes[0].activeTabId = tabId;
        
        // Focus the editor
        setTimeout(() => {
            tab.editor.focus();
        }, 0);
        
        this.emit('tab-changed', { tabId, previousTabId });
    }
    
    /**
     * Close a tab
     * @param {string} tabId
     * @param {boolean} force - Force close without checking for unsaved changes
     * @returns {boolean} Whether the tab was closed
     */
    async closeTab(tabId, force = false) {
        if (!this.tabs.has(tabId)) {
            return false;
        }
        
        const tab = this.tabs.get(tabId);
        
        // Check for unsaved changes
        if (!force && tab.isDirty && tab.filePath) {
            const confirmed = confirm(`"${tab.title}" has unsaved changes. Close anyway?`);
            if (!confirmed) {
                return false;
            }
        }
        
        // Remove from DOM
        tab.editorContainer.remove();
        
        // Remove from data structures
        this.tabs.delete(tabId);
        this.tabOrder = this.tabOrder.filter(id => id !== tabId);
        this.panes[0].tabIds = this.panes[0].tabIds.filter(id => id !== tabId);
        
        // If this was the active tab, activate another
        if (this.activeTabId === tabId) {
            const newActiveIndex = Math.max(0, this.tabOrder.indexOf(tabId) - 1);
            if (this.tabOrder.length > 0) {
                this.activateTab(this.tabOrder[newActiveIndex]);
            } else {
                this.activeTabId = null;
                this.panes[0].activeTabId = null;
            }
        }
        
        this.emit('tab-closed', { tabId });
        return true;
    }
    
    /**
     * Get the active tab
     * @returns {Object|null}
     */
    getActiveTab() {
        return this.activeTabId ? this.tabs.get(this.activeTabId) : null;
    }
    
    /**
     * Get all tabs in order
     * @returns {Array}
     */
    getTabs() {
        return this.tabOrder.map(id => this.tabs.get(id));
    }
    
    /**
     * Find tab by file path
     * @param {string} filePath
     * @returns {Object|null}
     */
    findTabByPath(filePath) {
        for (const tab of this.tabs.values()) {
            if (tab.filePath === filePath) {
                return tab;
            }
        }
        return null;
    }
    
    /**
     * Reorder tabs
     * @param {string} tabId - Tab to move
     * @param {number} newIndex - New position
     */
    reorderTabs(tabId, newIndex) {
        const oldIndex = this.tabOrder.indexOf(tabId);
        if (oldIndex === -1) return;
        
        this.tabOrder.splice(oldIndex, 1);
        this.tabOrder.splice(newIndex, 0, tabId);
        
        // Update pane tab order too
        const paneIndex = this.panes[0].tabIds.indexOf(tabId);
        if (paneIndex !== -1) {
            this.panes[0].tabIds.splice(paneIndex, 1);
            this.panes[0].tabIds.splice(newIndex, 0, tabId);
        }
        
        this.emit('tabs-reordered', { tabId, oldIndex, newIndex });
    }
    
    /**
     * Mark tab as dirty (has unsaved changes)
     * @param {string} tabId
     * @param {boolean} isDirty
     */
    setTabDirty(tabId, isDirty) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.isDirty = isDirty;
        }
    }
    
    /**
     * Update tab title
     * @param {string} tabId
     * @param {string} title
     */
    updateTabTitle(tabId, title) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.title = title;
        }
    }
    
    /**
     * Add event listener
     * @param {string} event
     * @param {Function} callback
     */
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }
    
    /**
     * Remove event listener
     * @param {string} event
     * @param {Function} callback
     */
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }
    
    /**
     * Emit event
     * @param {string} event
     * @param {Object} data
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
    
    /**
     * Get state for persistence
     * @returns {Object}
     */
    getState() {
        return {
            tabs: this.tabOrder.map(id => {
                const tab = this.tabs.get(id);
                return {
                    id: tab.id,
                    filePath: tab.filePath,
                    title: tab.title
                };
            }),
            activeTabId: this.activeTabId
        };
    }
    
    /**
     * Restore from saved state
     * @param {Object} state
     */
    async restoreState(state) {
        // Implementation for restoring tabs from saved state
        // Will be implemented when we add persistence
    }
}