# Aura

**A fast, private, and beautiful open-source notes app with AI-powered knowledge discovery.**

Aura is a modern, local-first, and open-source knowledge management application that combines the power of AI with the simplicity of Markdown. It provides the polish and performance of a native application with the privacy and data ownership of a local-first approach. Your notes are stored as plain Markdown files on your computer, so you're always in control. With integrated AI chat, powerful tab management, split-view editing, and seamless image integration, Aura transforms how you capture, organize, and discover knowledge.

---

## ✨ Key Features

*   **📝 Beautiful Markdown Editor:** A distraction-free writing experience with live preview, beautiful typography (Inter font), and advanced formatting.
*   **🚀 Fast & Lightweight:** Built with Tauri and Rust, Aura is incredibly fast and has a tiny memory footprint.
*   **🔒 Privacy First & Local:** Your data is yours. Aura is 100% local, with no telemetry or cloud dependencies.
*   **🧠 AI & Knowledge Discovery:** Integrated local AI-powered chat with notes.
*   **🗂️ Tabs & Split View:** Open and edit multiple notes at once. Organize your workspace with a powerful tab system and resizable split panes.
*   **🖼️ Seamless Image Integration:** Simply paste images from your clipboard directly into your notes. Aura handles the rest.
*   **🌟 Highlights Summarization:** Instantly extract and summarize all highlighted text from your notes with one click. Use highlights as key 'context' in AI chat with notes. 
*   **📤 Export to Multiple Formats:** Export your notes to PDF, HTML, or Word documents with perfect formatting preservation.
*   **🌐 Cross-Platform:** Available for Windows, macOS, and Linux.

## 🚀 Getting Started (Beta)

### For Users (No Setup Required!) 

1.  Download the latest DMG installer <<< coming soon!
2.  Double-click the DMG file to mount it
3.  Drag Aura.app to your Applications folder
4.  Launch Aura from Applications or Spotlight

**That's it!** No additional software or setup needed. The installer includes everything required to run Aura.

## 🛠️ For Developers

Aura is open source and we welcome contributions!

### Quick Start

```bash
# Clone the repository
git clone https://github.com/gaimplan/aura.git
cd aura

# Check Dependencies 

# Cargo for Rust must be installed
which cargo

# If not installed, use following to install Rust which includes Cargo
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Make Cargo available in the current shell:
source "$HOME/.cargo/env"

# Verify Cargo is available:
cargo --version

# Verify Node version 22 or later and NPM version 10 or later are installed: 
node --version && npm --version

# Install dependencies
npm install

# Run the development server
npm run tauri dev
```

### Contributing

We'd love your help building Aura! Here are a few ways you can contribute:

*   **🐛 Report Bugs:** Find an issue? [Open a bug report](https://github.com/gaimplan/aura/issues/new?template=bug_report.md).
*   **💡 Request Features:** Have an idea? [Submit a feature request](https://github.com/gaimplan/aura/issues/new?template=feature_request.md).
*   **🧑‍💻 Submit a Pull Request:** Fork the repo, make your changes, and open a PR.

## 🗺️ Roadmap

Our vision is to create the best open-source AI-native local notes application. Here's what we're focused on:

*   **🔄 Sync & Mobile:** A native iOS companion app with s
*   **🔌 Extensibility:** A secure plugin system for community contributions.

## 📄 License

Aura is licensed under the [Apache 2.0 License](LICENSE).

---

**Built with ❤️ for those who value privacy, performance, and beautiful software.**

