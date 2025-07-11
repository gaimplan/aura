# Aura

**A fast, private, and beautiful open-source notes app.**

Aura is a modern, local-first, and open-source knowledge management application. It provides the polish and performance of a native application with the privacy and data ownership of a local-first approach. Your notes are stored as plain Markdown files on your computer, so you're always in control.

---

## ✨ Key Features

*   **📝 Beautiful Markdown Editor:** A distraction-free writing experience with live preview, beautiful typography (Inter font), and advanced formatting.
*   **🗂️ Tabs & Split View:** Open and edit multiple notes at once. Organize your workspace with a powerful tab system and resizable split panes.
*   **🖼️ Seamless Image Integration:** Simply paste images from your clipboard directly into your notes. Aura handles the rest.
*   **🔒 Privacy First & Local:** Your data is yours. Aura is 100% local, with no telemetry or cloud dependencies.
*   **🚀 Fast & Lightweight:** Built with Tauri and Rust, Aura is incredibly fast and has a tiny memory footprint.
*   **🌐 Cross-Platform:** Available for Windows, macOS, and Linux.

## 🚀 Getting Started (Beta)

### For Users (No Setup Required!)

1.  Download the latest DMG installer: [Aura_0.1.0_aarch64.dmg](https://github.com/gaimplan/aura/raw/refs/heads/main/beta/Aura_0.1.0_aarch64.dmg)
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

*   **✅ Core Editor & UI:** A polished and feature-rich editor.
*   **🔄 Sync & Mobile:** A native iOS companion app with seamless iCloud sync.
*   **🧠 AI & Knowledge Discovery:** Integrating local AI-powered search and discovery features.
*   **🔌 Extensibility:** A secure plugin system for community contributions.

## 📄 License

Aura is licensed under the [MIT License](LICENSE).

---

**Built with ❤️ for those who value privacy, performance, and beautiful software.**

