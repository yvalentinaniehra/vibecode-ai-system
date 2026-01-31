# Workflow Generator

Auto-generate Vibecode workflow files from user stories using AI-powered parsing.

## Features

- 🤖 **AI-Powered Parsing** - Extracts intent, domain, and keywords from natural language
- 🔒 **Security First** - Path traversal protection and input sanitization
- 📦 **Dynamic Registries** - JSON-based agent and tool configurations
- 🎨 **Template Engine** - Handlebars-based workflow generation
- 💻 **Interactive CLI** - User-friendly prompts with preview
- ✅ **Type-Safe** - Full TypeScript with strict mode

## Installation

```bash
cd tools/workflow-generator
npm install
npm run build
```

## Usage

### Interactive Mode

```bash
npm run workflow:create
```

### Non-Interactive Mode

```bash
npm run workflow:create -- --story "Deploy backend to Cloud Run" --output deploy-backend.md
```

### Options

- `-s, --story <story>` - User story description
- `-a, --agent <agent>` - Force specific agent
- `-o, --output <path>` - Output path
- `--no-ai` - Disable AI parsing
- `--dry-run` - Preview without writing file
- `--overwrite` - Overwrite existing file

## Examples

### Example 1: Deploy Workflow

```bash
npm run workflow:create -- --story "Deploy backend to Google Cloud Run"
```

**Output:** `.agent/workflows/deploy-backend-to-google-cloud-run.md`

### Example 2: Database Schema

```bash
npm run workflow:create -- --story "Create database schema for user authentication"
```

**Output:** `.agent/workflows/create-database-schema-for-user-authentication.md`

## Architecture

```
src/
├── cli/                    # CLI interface
│   ├── index.ts           # Entry point
│   ├── prompts.ts         # Interactive prompts
│   └── display.ts         # Output formatting
├── parser/                # NLP parsing
│   ├── story-parser.ts    # User story parser
│   ├── agent-matcher.ts   # Agent selection
│   └── tool-selector.ts   # Tool recommendation
├── generator/             # Template generation
│   ├── template-engine.ts # Handlebars engine
│   └── workflow-builder.ts # Orchestrator
├── validator/             # Security & validation
│   ├── path-validator.ts  # Path traversal protection
│   └── input-sanitizer.ts # Input sanitization
├── data/                  # Configuration
│   ├── agent-registry.ts  # Agent definitions
│   ├── tool-registry.ts   # Tool definitions
│   └── templates/         # Handlebars templates
└── types/                 # TypeScript types
    ├── index.ts
    └── errors.ts
```

## Configuration

### Agent Registry

Edit `.agent/config/agent-registry.json` to add/update agents:

```json
{
  "coder": {
    "name": "Coder Agent",
    "phase": "3.3 - Engineering",
    "model": "Claude Sonnet 4.5",
    "modelReason": "Best coding capability",
    "keywords": ["code", "implement", "build"],
    "defaultTools": ["write_to_file", "run_command"]
  }
}
```

### Tool Registry

Edit `.agent/config/tool-registry.json` to add/update tools:

```json
{
  "write_to_file": {
    "name": "Write File",
    "category": "file-system",
    "description": "Create or overwrite files"
  }
}
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm run test
npm run test:coverage
```

### Lint

```bash
npm run lint
npm run format
```

## Security

- **Path Traversal Protection**: All paths validated against `.agent/workflows/`
- **Input Sanitization**: User input sanitized before processing
- **Tool Whitelisting**: Only registered tools allowed
- **No Code Injection**: Template data sanitized

## License

MIT
