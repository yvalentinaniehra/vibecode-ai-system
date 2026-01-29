# Context Map - Vibecode AI System

**Purpose:** This document provides orientation for AI agents working on this project.

---

## Project Overview

**Vibecode AI System** is a unified AI orchestration platform for software development. It routes tasks to specialized AI agents and automates complex development workflows.

**Version:** 0.2.0
**Status:** Stable and Working
**Repository:** https://github.com/yvalentinaniehra/vibecode-ai-system.git

---

## Architecture

```
control-agent-full/
├── vibe.py                     # Main CLI entry point
├── agents/                     # AI agent implementations
│   ├── api_agent.py            # Strategic analysis & planning
│   ├── cli_agent.py            # Code execution & implementation
│   └── antigravity_agent.py    # Advanced agentic coding tasks
├── core/                       # Core system components
│   ├── orchestrator.py         # Agent coordination logic
│   ├── task_router.py          # Smart task routing
│   ├── workflow_engine.py      # YAML workflow execution
│   └── context_manager.py      # Project context persistence
├── utils/                      # Utility modules
│   ├── cost_tracker.py         # API cost tracking
│   └── logger.py               # Logging utilities
├── workflows/                  # YAML workflow definitions
│   ├── feature.yaml            # New feature workflow
│   ├── bugfix.yaml             # Bug fix workflow
│   ├── code-review.yaml        # Code review workflow
│   └── quick-task.yaml         # Quick task workflow
├── vscode-extension/           # VS Code extension
│   ├── src/                    # TypeScript source code
│   ├── out/                    # Compiled JavaScript
│   └── vibecode-0.1.0.vsix     # Installable package
├── tests/                      # Test suite
├── .vibecode/                  # Runtime data (context, history)
└── logs/                       # Log files
```

---

## Key Components

### 1. CLI (`vibe.py`)
The main entry point. Supports:
- `python vibe.py task "..."` - Execute a task
- `python vibe.py interactive` - REPL mode
- `python vibe.py workflow <name>` - Run workflows
- `python vibe.py stats` - Session statistics
- `python vibe.py context` - Show project context

### 2. Agents
| Agent | Purpose | Use When |
|-------|---------|----------|
| API Agent | Analysis, planning, documentation | Strategic/review tasks |
| CLI Agent | Code execution, file operations | Implementation tasks |
| Antigravity | Complex multi-step operations | Large refactoring |

### 3. VS Code Extension
- Located in `vscode-extension/`
- Provides GUI for Vibecode commands
- Output formatting with clean webview rendering
- Install via: `code --install-extension vscode-extension/vibecode-0.1.0.vsix`

### 4. Workflow Engine
- YAML-based workflow definitions
- Supports variables, multi-step execution
- Located in `workflows/` directory

---

## Environment Setup

### Requirements
- Python 3.13+
- Node.js (for extension development)
- Anthropic API key

### Configuration
```bash
# Install Python dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Add ANTHROPIC_API_KEY to .env
```

---

## Current State (2026-01-29)

### Component Status Summary
| Component | Status | Details |
|-----------|--------|---------|
| VS Code Extension | **Working** | Installed via VSIX method |
| Output Formatting | **Formatted** | Clean webview rendering verified |
| Install Method | **VSIX** | `vibecode-0.1.0.vsix` package |
| CLI | **Operational** | `python vibe.py` entry point |
| Multi-Agent System | **Operational** | API, CLI, Antigravity agents |
| Workflow Engine | **Working** | YAML-based definitions |
| Context Persistence | **Active** | `.vibecode/context.json` |

### Working
- Main CLI fully functional
- All three agents operational
- Workflow engine working
- VS Code extension installed and working (VSIX verified)
- Context persistence active
- Agent output formatting improved and verified

### Recent Fixes
- VS Code extension output formatting (Rich library rendering issues resolved)
- VSIX package built and tested successfully
- Extension activation and command execution verified

### Pending/Future Work
- Unit tests for VS Code extension
- Streaming output for long-running tasks
- Syntax highlighting in webview code blocks
- Tree view sidebar for workflows

---

## Quick Start for Next Agent

1. **Check status:**
   ```bash
   cd D:/project/control-agent-full
   git status
   python vibe.py help
   ```

2. **Test the system:**
   ```bash
   python vibe.py task "Hello world test"
   python vibe.py workflow list
   ```

3. **Key files to review:**
   - `vibe.py` - CLI entry point
   - `core/orchestrator.py` - Agent coordination
   - `vscode-extension/src/webview/panel.ts` - Extension UI

---

## Git Information

- **Branch:** main
- **Remote:** origin (GitHub)
- **Recent commits:** Check with `git log --oneline -5`
