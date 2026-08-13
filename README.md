# Astro Code Editor AI 

-lightweight, high-performance AI-powered code editor and IDE built from scratch using **Tauri 2**, **Rust**, **React**, and **Monaco Editor**. 

Designed as the ultimate minimal alternative to heavy development environments, **Astro Code Editor AI** delivers a modern, blazing-fast workspace running smoothly on just **~ < 20 MB of RAM**.

---

##  Important Note on Naming

**Astro Code Editor AI** is an independent, lightweight text editor built in Rust. It is **NOT** affiliated with, related to, or a part of the *Astro.build (Astro Framework)* web development platform. If you are looking for a microscopic memory footprint with native AI capabilities, you are in the right place!

---

## Performance Comparison

By bypassing the heavy Chromium/Electron runtimes and leveraging optimized native system webviews, Astro Code Editor AI achieves unmatched efficiency, outperforming even native C++ and GPUI editors in memory consumption:

| Editor | Technology Stack | Idle RAM Usage | AI Native |
| :--- | :--- | :--- | :--- |
| **VS Code / Cursor** | Electron / Chromium | ~500 MB - 1.2 GB | Yes / Via Plugins |
| **Zed Editor** | Rust (GPUI) | ~150 MB - 300 MB | Yes |
| **Sublime Text** | C++ (Custom UI) | ~50 MB - 100 MB | No |
|  **Astro Code Editor AI** | **Rust + Tauri 2** | **~9 MB**  | **Yes (Built-in)** |

---

## Key Features

* **Microscopic 9 MB RAM Footprint:** Eliminates memory bloating entirely.
* **Tiny Distribution:** Super-small installation footprint (Installer: ~1.75 MB / Executable: ~3.5 MB).
* **Full LSP Integration:** Native Language Server Protocol support for smart autocompletion, syntax checking, and code diagnostics.
* **Omnipresent AI Workspace:** Context-aware AI assistant integrated deeply throughout the entire editor interface.
* **Native Windows 11 Acrylic Design:** Implements clean, native transparency and blur effects without GPU overhead.

---

## Ecosistema & Roadmap (Próximas Funciones)

- [x] Full LSP Support & Code Auto-completion.
- [x] Omnipresent AI Assistant in Workspace.
- [ ] **Cloud Music Player:** Built-in streaming music player running directly on the cloud to save local machine resources while coding.
- [ ] **Mobile Companion App:** Cross-platform mobile ecosystem extension to monitor and interact with your developer environment.
- [x] Highly Extensible Plugin Architecture.

---

## Tech Stack & Architecture

* **Backend:** Rust & Tauri 2 (Handles high-performance file system operations, window management, and native OS APIs).
* **Frontend:** React, TypeScript, and Monaco Editor (Utilizes the powerful, feature-rich editing core engine that drives VS Code, minus the telemetry and bloat).

---

## Getting Started & Installation

Follow these quick steps to clone and run the editor locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Jeshua3545926/Astro-Code-Editor-Ai.git
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server via Tauri:**
   ```bash
   npm run tauri dev
   ```

---

## License & Credits

Developed with ⚡ by **Jeshua3545926** 🇲🇽.  
Licensed under the **GPLv3 License** — completely open source, transparent, and telemetry-free.


<img width="1712" height="1047" alt="image" src="https://github.com/Jeshua3545926/Astro-Code-Editor-Ai/blob/main/Screenshot%202026-08-09%20130121.png?raw=true" />
<img width="1658" height="982" alt="Screenshot 2026-08-11 130818" src="https://github.com/user-attachments/assets/e0c44fc7-14ec-4175-bce8-0f300975bcd7" />

