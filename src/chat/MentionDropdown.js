// MentionDropdown.js - @ mention search dropdown
console.log('🔍 MentionDropdown loading...');

export class MentionDropdown {
  constructor() {
    console.log('🔧 Initializing MentionDropdown');
    this.container = null;
    this.isVisible = false;
    this.searchQuery = '';
    this.results = [];
    this.selectedIndex = 0;
    this.onSelect = null;
    this.position = { top: 0, left: 0 };
  }
  
  show(position, query = '') {
    console.log('📍 Showing mention dropdown at:', position);
    this.position = position;
    this.searchQuery = query;
    this.isVisible = true;
    
    if (!this.container) {
      this.createContainer();
    }
    
    // Position the dropdown
    this.container.style.top = `${position.top}px`;
    this.container.style.left = `${position.left}px`;
    this.container.style.display = 'block';
    
    // Search for notes
    this.search(query);
  }
  
  hide() {
    console.log('🙈 Hiding mention dropdown');
    this.isVisible = false;
    this.selectedIndex = 0;
    
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
  
  createContainer() {
    console.log('🏗️ Creating mention dropdown container');
    
    // Remove existing container if any
    const existing = document.getElementById('mention-dropdown');
    if (existing) {
      existing.remove();
    }
    
    this.container = document.createElement('div');
    this.container.id = 'mention-dropdown';
    this.container.className = 'mention-dropdown';
    this.container.style.display = 'none';
    
    document.body.appendChild(this.container);
  }
  
  async search(query) {
    console.log('🔎 Searching for:', query);
    
    try {
      // Use the context manager to search
      if (window.chatContextManager) {
        this.results = await window.chatContextManager.searchNotes(query);
        console.log(`✅ Found ${this.results.length} results`);
        this.render();
      }
    } catch (error) {
      console.error('❌ Error searching notes:', error);
      this.results = [];
      this.render();
    }
  }
  
  render() {
    if (!this.container) return;
    
    if (this.results.length === 0) {
      this.container.innerHTML = `
        <div class="mention-dropdown-empty">
          ${this.searchQuery ? 'No notes found' : 'Type to search notes...'}
        </div>
      `;
      return;
    }
    
    const html = this.results.map((note, index) => {
      const isSelected = index === this.selectedIndex;
      const displayName = note.name.replace('.md', '');
      const path = note.path.split('/').slice(0, -1).join('/') || 'root';
      
      return `
        <div class="mention-dropdown-item ${isSelected ? 'selected' : ''}" 
             data-index="${index}"
             data-path="${note.path}">
          <div class="mention-item-name">${this.highlightMatch(displayName)}</div>
          <div class="mention-item-path">${path}</div>
        </div>
      `;
    }).join('');
    
    this.container.innerHTML = html;
    
    // Add click handlers
    this.container.querySelectorAll('.mention-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(item.dataset.index);
        this.selectItem(index);
      });
      
      item.addEventListener('mouseenter', (e) => {
        this.selectedIndex = parseInt(item.dataset.index);
        this.render();
      });
    });
  }
  
  highlightMatch(text) {
    if (!this.searchQuery) return text;
    
    const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }
  
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  selectItem(index) {
    if (index >= 0 && index < this.results.length) {
      const selected = this.results[index];
      console.log('✅ Selected note:', selected);
      
      if (this.onSelect) {
        this.onSelect(selected);
      }
      
      this.hide();
    }
  }
  
  // Keyboard navigation
  handleKeyDown(e) {
    if (!this.isVisible) return false;
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
        this.render();
        return true;
        
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.render();
        return true;
        
      case 'Enter':
        e.preventDefault();
        this.selectItem(this.selectedIndex);
        return true;
        
      case 'Escape':
        e.preventDefault();
        this.hide();
        return true;
        
      default:
        return false;
    }
  }
  
  // Update search as user types
  updateSearch(query) {
    this.searchQuery = query;
    this.selectedIndex = 0;
    this.search(query);
  }
  
  // Check if click is outside dropdown
  handleClickOutside(e) {
    if (this.isVisible && this.container && !this.container.contains(e.target)) {
      this.hide();
    }
  }
}