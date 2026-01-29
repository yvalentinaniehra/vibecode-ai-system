# Vibecode AI System

A unified AI orchestration system for software development. Vibecode intelligently routes tasks to specialized AI agents and automates complex development workflows.

## Features

- **Multi-Agent Architecture** - Specialized agents for different types of tasks
  - **API Agent** - Strategic analysis & planning
  - **CLI Agent** - Code execution & implementation
  - **Antigravity Agent** - Advanced agentic coding tasks
- **Workflow Engine** - Automated multi-step development processes
- **Smart Task Routing** - Automatically selects the best agent for each task
- **Context Persistence** - Maintains project memory across sessions
- **Interactive REPL** - Real-time conversation mode with AI agents

## Requirements

- Python 3.13+
- Anthropic API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd control-agent-full
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

## Usage

### Basic Commands

```bash
# Show help
python vibe.py help

# Execute a task (auto-routes to best agent)
python vibe.py task "Analyze the architecture"

# Force specific agent
python vibe.py task "Implement login form" --cli
python vibe.py task "Review this design" --api
python vibe.py task "Complex refactoring" --antigravity

# Start interactive mode
python vibe.py interactive

# Show session statistics
python vibe.py stats

# Show current project context
python vibe.py context
```

### Workflow Commands

```bash
# List available workflows
python vibe.py workflow list

# Run a workflow by name
python vibe.py workflow feature
python vibe.py workflow bugfix

# Run workflow from file
python vibe.py workflow run workflows/feature.yaml

# Run with variables
python vibe.py workflow feature --var feature_name="User Auth"

# Preview without executing
python vibe.py workflow run workflows/feature.yaml --dry-run
```

### Task Options

| Option | Description |
|--------|-------------|
| `--api` | Force use of API agent |
| `--cli` | Force use of CLI agent |
| `--antigravity` | Force use of Antigravity agent |
| `--no-context` | Don't include project context |

### Workflow Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview workflow without executing |
| `--var key=value` | Set workflow variable |

## Project Structure

```
control-agent-full/
├── vibe.py                 # Main entry point
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables
├── agents/                 # AI agent implementations
│   ├── api_agent.py        # Strategic analysis agent
│   ├── cli_agent.py        # Code execution agent
│   └── antigravity_agent.py # Advanced agentic agent
├── core/                   # Core system components
│   ├── orchestrator.py     # Agent coordination
│   ├── task_router.py      # Smart task routing
│   ├── workflow_engine.py  # Workflow execution
│   └── context_manager.py  # Project context management
├── utils/                  # Utility modules
│   ├── cost_tracker.py     # API cost tracking
│   └── logger.py           # Logging utilities
├── workflows/              # Workflow definitions
│   ├── feature.yaml        # New feature workflow
│   ├── bugfix.yaml         # Bug fix workflow
│   ├── code-review.yaml    # Code review workflow
│   ├── ocean-edu-feature.yaml # Ocean Edu specific
│   └── quick-task.yaml     # Quick task workflow
├── .vibecode/              # Runtime data
│   ├── context.json        # Project context
│   └── history/            # Session history
└── logs/                   # Log files
```

## Agents

### API Agent
Handles strategic tasks that require analysis and planning:
- Architecture design
- Code review and analysis
- Technical documentation
- Problem investigation

### CLI Agent
Handles implementation tasks that require code execution:
- Writing and modifying code
- Running tests
- File operations
- Git operations

### Antigravity Agent
Handles complex, multi-step agentic tasks:
- Large-scale refactoring
- Cross-file modifications
- Complex debugging sessions

## Workflows

Workflows are YAML files that define multi-step automated processes.

### Available Workflows

| Workflow | Description |
|----------|-------------|
| `feature` | Develop a new feature from start to finish |
| `bugfix` | Diagnose and fix bugs systematically |
| `code-review` | Comprehensive code review process |
| `ocean-edu-feature` | Ocean Education project specific workflow |
| `quick-task` | Fast execution for simple tasks |

### Creating Custom Workflows

Create a YAML file in the `workflows/` directory:

```yaml
name: my-workflow
description: My custom workflow
variables:
  task_name: ""
steps:
  - name: Analyze
    agent: api
    prompt: "Analyze the requirements for {{task_name}}"
  - name: Implement
    agent: cli
    prompt: "Implement {{task_name}} based on the analysis"
  - name: Review
    agent: api
    prompt: "Review the implementation"
```

## Configuration

### Environment Variables

Create a `.env` file with:

```env
ANTHROPIC_API_KEY=your-api-key-here
```

### Context Configuration

Project context is stored in `.vibecode/context.json` and includes:
- Project metadata
- Tech stack information
- Coding conventions
- Active and completed tasks

## VS Code Extension

The Vibecode AI System includes a VS Code extension for seamless IDE integration.

### Installation

**Option A: Install from VSIX (Recommended)**
```bash
code --install-extension vscode-extension/vibecode-0.1.0.vsix
```

**Option B: Development Mode**
```bash
cd vscode-extension
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

### Extension Features

- **Activity Bar**: Agents, Workflows, and History views in the sidebar
- **Commands**:
  - `Ctrl+Shift+V` - Execute a task with AI
  - `Ctrl+Shift+A` - Analyze selected code
- **Context Menu**: Right-click on selected code to:
  - Analyze Selection
  - Explain This Code
  - Refactor This Code
  - Generate Tests
- **Output Channel**: View AI responses in the "Vibecode AI" output channel

### Extension Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `vibecode.pythonPath` | `python` | Path to Python executable |
| `vibecode.vibecodeCliPath` | (auto) | Path to vibe.py |
| `vibecode.defaultAgent` | `auto` | Default agent for tasks |
| `vibecode.showNotifications` | `true` | Show completion notifications |

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
