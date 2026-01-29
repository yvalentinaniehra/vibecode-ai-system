# PROJECT CONTEXT - Vibecode AI System

**Last Updated:** 2026-01-29
**Prepared by:** Antigravity Agent (Claude Opus 4.5)
**Purpose:** Handover documentation for next agent session

---

## 1. Tong Quan Du An (Project Overview)

### Vibecode la gi? (What is Vibecode?)

**Vibecode** la mot **VS Code Extension** ket hop voi he thong AI multi-agent, cho phep developers tuong tac voi AI agents truc tiep trong VS Code de ho tro coding.

**Vibecode** is a **VS Code Extension** combined with a multi-agent AI system that allows developers to interact with AI agents directly within VS Code for coding assistance.

### Cac thanh phan chinh (Main Components)

| Component | Description | Location |
|-----------|-------------|----------|
| VS Code Extension | UI integration trong VS Code | `vscode-extension/` |
| CLI Tool | Command-line interface | `vibe.py` |
| Multi-Agent System | API, CLI, Antigravity agents | `agents/` |
| Workflow Engine | YAML-based automation | `workflows/` |
| Core Orchestrator | Agent coordination | `core/` |

---

## 2. Trang Thai Hien Tai (Current Status)

### Extension Status: WORKING

| Item | Status | Details |
|------|--------|---------|
| VS Code Extension | Hoat dong (Working) | Installed via VSIX |
| VSIX Package | `vibecode-0.1.0.vsix` | Ready to install |
| Output Formatting | Da sua (Fixed) | Clean rendering in webview |
| CLI (`vibe.py`) | Hoat dong (Operational) | Python 3.13+ required |
| Multi-Agent System | Hoat dong (Operational) | API, CLI, Antigravity |

### Git Status

- **Branch:** `main`
- **Remote:** `https://github.com/yvalentinaniehra/vibecode-ai-system.git`
- **Status:** Synced with remote (pushed on 2026-01-29)

---

## 3. Cac Thay Doi Gan Day (Recent Changes)

### Session 2026-01-29

1. **Sua loi F5 (Fixed F5 Debug Issue)**
   - Extension khong chay khi nhan F5 - da fix
   - Loi "command not found" - da resolve

2. **Cai dat tu VSIX (VSIX Installation)**
   - Build thanh cong: `vibecode-0.1.0.vsix`
   - Install command: `code --install-extension vscode-extension/vibecode-0.1.0.vsix`

3. **Cai thien Output Format (Improved Response Formatting)**
   - Fix Rich library box-drawing characters
   - Strip ANSI escape codes for clean display
   - Structured formatting: headers, bullets, key-value pairs
   - Removed emoji rendering issues

---

## 4. Huong Dan Ky Thuat (Technical Guide)

### 4.1 Cach Dong Goi Extension (How to Package)

```bash
cd vscode-extension

# Compile TypeScript
npm run compile

# Package to VSIX
npm run package
# hoac (or):
npx vsce package
```

Output: `vibecode-0.1.0.vsix`

### 4.2 Cach Cai Dat (How to Install)

**Method 1: Command Line**
```bash
code --install-extension vscode-extension/vibecode-0.1.0.vsix
```

**Method 2: VS Code UI**
1. Open VS Code
2. Ctrl+Shift+P -> "Extensions: Install from VSIX..."
3. Select `vibecode-0.1.0.vsix`

### 4.3 Cach Debug (How to Debug)

```bash
cd vscode-extension
npm run compile
```

Then in VS Code:
1. Open project folder in VS Code
2. Press `F5` to launch Extension Development Host
3. A new VS Code window opens with extension loaded

### 4.4 Cach Su Dung CLI (How to Use CLI)

```bash
# Help
python vibe.py help

# Execute task
python vibe.py task "Your task description"

# Interactive mode
python vibe.py interactive

# Run workflow
python vibe.py workflow <workflow_name>
```

---

## 5. Cau Truc Thu Muc (Project Structure)

```
control-agent-full/
├── vibe.py                    # Main CLI entry point
├── agents/                    # AI agent implementations
│   ├── api_agent.py          # Anthropic API agent
│   ├── cli_agent.py          # CLI-based agent
│   └── antigravity_agent.py  # Antigravity agent
├── core/                      # Core system
│   ├── orchestrator.py       # Agent coordination
│   ├── router.py             # Task routing
│   └── workflow_engine.py    # Workflow execution
├── utils/                     # Utilities
│   ├── cost_tracker.py       # API cost tracking
│   └── logger.py             # Logging
├── workflows/                 # YAML workflow definitions
├── vscode-extension/          # VS Code Extension
│   ├── src/                   # TypeScript source
│   │   ├── extension.ts      # Main extension entry
│   │   └── webview/panel.ts  # Webview panel (output formatting)
│   ├── out/                   # Compiled JavaScript
│   ├── package.json          # Extension manifest
│   └── vibecode-0.1.0.vsix   # Installable package
├── tests/                     # Test suite
├── .vibecode/                 # Runtime data (context, history)
├── .env                       # Environment variables (API keys)
└── requirements.txt           # Python dependencies
```

---

## 6. Yeu Cau Moi Truong (Environment Requirements)

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.13+ | Required for CLI |
| Node.js | 18+ | For extension development |
| VS Code | 1.85+ | Target version |
| Anthropic API Key | - | Set in `.env` file |

### .env File Format
```
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

---

## 7. Cac File Quan Trong (Key Files)

| File | Purpose |
|------|---------|
| `vscode-extension/src/webview/panel.ts` | Webview panel with output formatting logic |
| `vscode-extension/src/extension.ts` | Extension activation and commands |
| `vibe.py` | CLI entry point |
| `core/orchestrator.py` | Agent coordination logic |
| `agents/api_agent.py` | Main API agent implementation |

---

## 8. Luu Y Cho Agent Tiep Theo (Notes for Next Agent)

### Do (Nen lam)
- Review `SESSION-LOG.md` for detailed session history
- Check `git log` for recent commits
- Test extension with `F5` or VSIX install before making changes

### Don't (Khong nen lam)
- Don't modify `.env` (contains API keys)
- Don't commit `node_modules/` or `.vibecode/` folders
- File `nul` is Windows junk - can be deleted

### Pending Tasks
- [ ] Add unit tests for VS Code extension
- [ ] Implement streaming output for long-running tasks
- [ ] Add syntax highlighting for code blocks in webview
- [ ] Consider tree view sidebar for workflows

---

## 9. Lien He / References

- **GitHub:** https://github.com/yvalentinaniehra/vibecode-ai-system
- **Extension Version:** 0.1.0
- **System Version:** Vibecode AI System v0.2.0

---

*Document generated for agent handover - 2026-01-29*
