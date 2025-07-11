# Aura Beta Tester Guide

Welcome to the Aura beta! This guide will help you install and start using Aura, your new local-first knowledge management app.

## 📋 What You'll Need

- **macOS computer** (Apple Silicon M1/M2/M3 supported)
- **No additional software required** - everything is included!

## 🚀 Quick Installation

### Step 1: Download
1. Download the `Aura_0.1.0_aarch64.dmg` file from your beta access link
2. The file is about 9MB and should download quickly

### Step 2: Install
1. **Double-click** the downloaded DMG file
2. A new window will open showing the Aura app icon
3. **Drag the Aura icon** to your Applications folder
4. **Eject the DMG** by clicking the eject button in Finder

### Step 3: Launch
1. Open **Applications** folder or press `Cmd+Space` and type "Aura"
2. **Double-click Aura** to launch
3. If you see a security warning, **right-click** → **Open** → **Open** (this is normal for beta apps)

🎉 **You're ready to start using Aura!**

## 🏠 First Time Setup

### Create Your First Vault
When you first launch Aura, you'll see a welcome screen:

1. **Click "Select Vault Folder"** 
2. **Choose a folder** where you want to store your notes (or create a new one)
3. **Click "Open"** to set up your vault

💡 **Tip**: Choose a folder in your Documents or create a new "Notes" folder - this will contain all your markdown files.

### Your First Note
1. **Press `Cmd+N`** to create a new note
2. **Type a filename** (e.g., "Welcome to Aura")
3. **Click "Create"**
4. **Start writing!** Aura uses Markdown formatting

## ✍️ Writing in Aura

### Live Preview Magic
Aura automatically hides markdown formatting as you type, creating a clean writing experience:

- **Type `**bold text**`** → becomes **bold text** (markers hidden)
- **Type `*italic text*`** → becomes *italic text* (markers hidden)  
- **Type `# Heading`** → becomes a large heading (# hidden)
- **Type `> Quote`** → becomes a styled blockquote (> hidden)

### Keyboard Shortcuts

#### File Management
- `Cmd+N` - Create new note
- `Cmd+S` - Save current note (auto-saves every 2 seconds)
- `Cmd+O` - Open vault folder

#### Formatting
- `Cmd+B` - **Bold** selected text
- `Cmd+I` - *Italic* selected text
- `Cmd+J` - <u>Underline</u> selected text
- `Cmd+H` - ==Highlight== selected text
- `Cmd+Shift+X` - ~~Strikethrough~~ selected text
- `Cmd+K` - Insert link
- `Cmd+Shift+H` - Generate highlights summary

#### Tabs & Navigation
- `Cmd+T` - New tab
- `Cmd+W` - Close current tab
- `Cmd+Tab` - Next tab
- `Cmd+1-5` - Switch to specific tab
- `Cmd+\` - Toggle split view (side-by-side editing)

#### View Options
- `Cmd+Option+Z` - Toggle zen mode (distraction-free writing)
- `ESC` - Exit zen mode
- `Cmd+Shift+C` - Toggle AI chat panel

## 🖼️ Working with Images

### Paste Images Directly
1. **Copy any image** (from web, screenshot, etc.)
2. **Paste with `Cmd+V`** directly into your note
3. **Images are automatically saved** to a `files/` folder in your vault
4. **Clean syntax**: Images show as `![[filename.png]]` in editing mode

### View Images
- **Click any image file** in the sidebar to view it in a tab
- **Images display full-size** with the filename as a heading

## 🗂️ Organizing Your Notes

### File Structure
Your vault folder contains:
- **Markdown files** (.md) - your actual notes
- **files/ folder** - pasted images and attachments
- **Subfolders** - organize notes however you like

### Sidebar Navigation
- **Click any file** to open it
- **Folders are collapsible** - click the arrow to expand/collapse
- **Recent files** appear at the top level for quick access

### Tabs System
- **Multiple notes open** - up to 5 tabs per pane
- **Split view** - `Cmd+\` for side-by-side editing
- **Drag tabs** to reorder them
- **• indicator** shows unsaved changes

## 💡 Highlights Summary

### Extract Important Points
Aura can automatically extract all ==highlighted text== from your note:

1. **Highlight important text** using `==text==` syntax or `Cmd+H`
2. **Press `Cmd+Shift+H`** or click the star button next to the + tab button
3. **A summary section** is created at the bottom with all highlights
4. **Perfect for**: study notes, meeting minutes, research papers

## 🤖 AI Chat Assistant

### Getting Started with AI
1. **Press `Cmd+Shift+C`** to open the chat panel
2. **Click the gear icon** to configure your AI provider
3. **Enter your API key** (OpenAI, Ollama, or LM Studio)
4. **Start chatting!** Your current note is automatically included as context

### AI Features
- **Context-aware**: AI sees your current note automatically
- **Add more context**: Click "Add Context" button to include other notes
- **Copy responses**: Click the copy button on any AI message
- **Export chats**: Click the ⬇️ button to save conversations to "Chat History" folder
- **New chat**: Click the + button to start fresh (clears current conversation)

💡 **Important**: Chat history persists between sessions but is cleared when you click "New Chat". Export important conversations to save them permanently!

## 📤 Export Your Work

### Export Formats
Aura can export your notes to multiple formats:

- **PDF**: `Cmd+Shift+E` - High-quality PDF with images
- **HTML**: Clean HTML with embedded images  
- **Word**: `Cmd+Shift+W` - Editable .doc format

### Export Process
1. **Open the note** you want to export
2. **Press the keyboard shortcut** or use the editor menu (☰)
3. **Choose save location** and filename
4. **Click Save** - your export is ready!

## 🎯 Tips for Beta Testing

### What to Try
- **Create different types of notes**: meeting notes, project plans, daily journals
- **Test formatting**: headings, lists, quotes, code blocks, tables
- **Try images**: paste screenshots, photos, diagrams
- **Use split view**: compare notes side-by-side
- **Export functionality**: PDF for sharing, Word for collaboration
- **Highlights summary**: Use ==highlights== and generate summaries
- **AI chat**: Ask questions about your notes, get writing help

### What to Report
Please let us know about:
- **Crashes or freezes** - when and what you were doing
- **Formatting issues** - text that doesn't display correctly
- **Save problems** - notes not saving properly
- **Performance issues** - slow typing, lag, etc.
- **Feature requests** - what would make Aura better for you?

### Performance Notes
- **Auto-save**: Notes save automatically every 2 seconds
- **Memory efficient**: Aura uses minimal system resources
- **Fast startup**: Should launch in under 2 seconds

## 🔧 Troubleshooting

### App Won't Open
**Issue**: "Cannot open because Apple cannot check it"
**Solution**: Right-click Aura → Open → Open (only needed once)

### Files Not Saving
**Issue**: Changes seem lost
**Check**: Look for • indicator in tab - means unsaved changes
**Solution**: Press `Cmd+S` to force save

### Images Not Displaying
**Issue**: Pasted images show as broken links
**Check**: Make sure you're pasting into a saved note (not "Untitled")
**Solution**: Save the note first (`Cmd+S`), then paste images

### Slow Performance
**Issue**: Typing feels laggy
**Cause**: Very large notes (10,000+ words) may slow down
**Solution**: Break large notes into smaller files

## 📞 Getting Help

### During Beta Period
- **Email**: [aura@gaimplan.com]
- **What to include**: 
  - What you were doing when the issue occurred
  - Screenshot if visual problem
  - Operating system version
  - Steps to reproduce the problem

### Quick Debug Info
To help us debug issues:
1. **Open Activity Monitor**
2. **Find "Aura" process**
3. **Note memory usage and CPU %**
4. **Include this info in bug reports**

## 🌟 What Makes Aura Special

### Privacy First
- **100% local** - no cloud, no tracking, no telemetry
- **Your files** - plain markdown files you can access anywhere
- **No lock-in** - works with any markdown editor

### Beautiful Experience  
- **Inter font** - same beautiful typography as Roam Research
- **Live preview** - see formatting without distractions
- **Native performance** - built with Rust for speed

### Powerful Features
- **Split view** - work on multiple notes simultaneously
- **Image integration** - seamless clipboard to note workflow
- **Export flexibility** - PDF, HTML, Word formats
- **Keyboard driven** - efficient shortcuts for power users
- **AI assistant** - context-aware chat with your notes
- **Highlights extraction** - automatically summarize important points

---

## Welcome to Aura! 🎉

Thank you for being a beta tester. Your feedback will help make Aura the best knowledge management app possible.

**Happy note-taking!** ✍️

---

*This guide covers Aura v0.1.0 beta. Features and shortcuts may change in future versions.*