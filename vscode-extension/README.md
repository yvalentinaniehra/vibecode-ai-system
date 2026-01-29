# Vibecode AI - VS Code Extension

AI-powered code assistant extension for Visual Studio Code, integrated with the Vibecode AI System.

## Features

- **Multi-Agent Support** - Access to API, CLI, Batch, and Antigravity agents
- **Smart Task Routing** - Automatically routes tasks to the best agent
- **Workflow Execution** - Run predefined workflows from the sidebar
- **Code Analysis** - Right-click to analyze, explain, or refactor code
- **Interactive Panel** - Chat-like interface for AI interactions
- **Task History** - View past task executions

## Requirements

- Visual Studio Code 1.85.0 or higher
- Python 3.13+ installed
- Vibecode AI System (vibe.py) in your workspace

## Installation

### From Source

1. Clone the repository
2. Navigate to the extension directory:
   ```bash
   cd vscode-extension
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Compile TypeScript:
   ```bash
   npm run compile
   ```
5. Press F5 in VS Code to launch Extension Development Host

### From VSIX

```bash
code --install-extension vibecode-0.1.0.vsix
```

## Usage

### Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| Execute Task | `Ctrl+Shift+V` | Run a task with AI |
| Analyze Selection | `Ctrl+Shift+A` | Analyze selected code |
| Open Panel | `Ctrl+Shift+P` | Open interactive panel |

### Sidebar Views

- **Agents** - Shows available AI agents
- **Workflows** - Lists available workflows (click to run)
- **History** - Recent task executions

### Context Menu

Right-click on selected code to:
- Analyze Selection
- Explain This Code
- Refactor This Code
- Generate Tests

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `vibecode.pythonPath` | `python` | Path to Python executable |
| `vibecode.vibecodeCliPath` | (auto) | Path to vibe.py |
| `vibecode.defaultAgent` | `auto` | Default agent for tasks |
| `vibecode.showNotifications` | `true` | Show completion notifications |

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Package extension
npm run package
```

## License

MIT
