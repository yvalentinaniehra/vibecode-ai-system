#!/usr/bin/env python3
"""
Vibecode CLI - Unified AI orchestration interface
Main entry point for the Vibecode AI System
"""
import sys
import os
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

from core.orchestrator import Orchestrator
from core.task_router import TaskRouter
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console(force_terminal=True)

VERSION = "0.2.0"


def show_banner():
    """Display welcome banner"""
    console.print(Panel(
        f"""[bold cyan]Vibecode AI System[/bold cyan] v{VERSION}

[dim]Unified AI orchestration for software development[/dim]

Agents:
  [cyan]API[/cyan]    - Strategic analysis & planning
  [green]CLI[/green]    - Code execution & implementation
  [yellow]Batch[/yellow]  - Batch operations (coming soon)

Features:
  [magenta]Workflows[/magenta] - Automated multi-step processes
  [blue]Context[/blue]   - Persistent project memory
""",
        border_style="cyan"
    ))


def show_help():
    """Display help message"""
    console.print("""
[bold cyan]Usage:[/bold cyan]
  python vibe.py <command> [options]

[bold cyan]Commands:[/bold cyan]
  task "<description>"       Execute a task (auto-routes to best agent)
  workflow <name>            Run a workflow
  workflow list              List available workflows
  workflow run <file>        Run workflow from file
  interactive                Start interactive REPL mode
  stats                      Show session statistics
  context                    Show current project context
  help                       Show this help message

[bold cyan]Task Options:[/bold cyan]
  --api                      Force use of API agent
  --cli                      Force use of CLI agent
  --no-context               Don't include project context

[bold cyan]Workflow Options:[/bold cyan]
  --dry-run                  Preview workflow without executing
  --var key=value            Set workflow variable

[bold cyan]Examples:[/bold cyan]
  python vibe.py task "Analyze the architecture"
  python vibe.py task "Implement login form" --cli
  python vibe.py workflow list
  python vibe.py workflow run workflows/feature.yaml
  python vibe.py workflow feature --var feature_name="User Auth"
  python vibe.py interactive
""")


def cmd_workflow(args):
    """Handle workflow commands"""
    from core.workflow_engine import WorkflowEngine, Workflow

    if len(args) < 1:
        console.print("[red]Error: Workflow command required[/red]")
        console.print("Usage: python vibe.py workflow <list|run|name>")
        return 1

    subcmd = args[0]
    engine = WorkflowEngine(str(PROJECT_ROOT))

    # List workflows
    if subcmd == 'list':
        workflows = engine.list_workflows()
        if not workflows:
            console.print("[yellow]No workflows found in workflows/ directory[/yellow]")
            return 0

        table = Table(title="Available Workflows")
        table.add_column("File", style="cyan")
        table.add_column("Name", style="green")
        table.add_column("Steps", justify="center")
        table.add_column("Description")

        for wf in workflows:
            if 'error' in wf:
                table.add_row(wf['file'], "[red]Error[/red]", "-", wf['error'])
            else:
                table.add_row(
                    wf['file'],
                    wf['name'],
                    str(wf['steps']),
                    wf.get('description', '')[:50]
                )

        console.print(table)
        return 0

    # Run workflow from file
    if subcmd == 'run':
        if len(args) < 2:
            console.print("[red]Error: Workflow file required[/red]")
            return 1

        workflow_file = args[1]
        dry_run = '--dry-run' in args

        # Parse variables
        variables = {}
        for arg in args[2:]:
            if arg.startswith('--var'):
                continue
            if '=' in arg:
                key, value = arg.split('=', 1)
                variables[key] = value

        try:
            workflow = engine.load_workflow(workflow_file)

            # Override variables
            for key, value in variables.items():
                workflow.variables[key] = value

            result = engine.execute(workflow, dry_run=dry_run)
            return 0 if result.get('success') else 1

        except FileNotFoundError:
            console.print(f"[red]Workflow file not found: {workflow_file}[/red]")
            return 1
        except Exception as e:
            console.print(f"[red]Workflow error: {e}[/red]")
            return 1

    # Run workflow by name (shortcut)
    workflow_file = PROJECT_ROOT / "workflows" / f"{subcmd}.yaml"
    if workflow_file.exists():
        dry_run = '--dry-run' in args

        # Parse variables
        variables = {}
        for i, arg in enumerate(args[1:]):
            if arg == '--var' and i + 2 < len(args):
                var_arg = args[i + 2]
                if '=' in var_arg:
                    key, value = var_arg.split('=', 1)
                    variables[key] = value
            elif '=' in arg and not arg.startswith('--'):
                key, value = arg.split('=', 1)
                variables[key] = value

        try:
            workflow = engine.load_workflow(str(workflow_file))

            # Override variables
            for key, value in variables.items():
                workflow.variables[key] = value

            result = engine.execute(workflow, dry_run=dry_run)
            return 0 if result.get('success') else 1

        except Exception as e:
            console.print(f"[red]Workflow error: {e}[/red]")
            return 1

    console.print(f"[red]Unknown workflow command or file: {subcmd}[/red]")
    return 1


def main():
    """Main entry point"""
    args = sys.argv[1:]

    # No arguments - show help
    if not args:
        show_banner()
        show_help()
        return 0

    command = args[0].lower()

    # Help command
    if command in ['help', '-h', '--help']:
        show_banner()
        show_help()
        return 0

    # Version command
    if command in ['version', '-v', '--version']:
        console.print(f"Vibecode AI System v{VERSION}")
        return 0

    # Workflow command
    if command == 'workflow':
        return cmd_workflow(args[1:])

    # Initialize orchestrator
    try:
        orchestrator = Orchestrator(str(PROJECT_ROOT))
    except Exception as e:
        console.print(f"[red]Failed to initialize orchestrator: {e}[/red]")
        return 1

    # Task command
    if command == 'task':
        if len(args) < 2:
            console.print("[red]Error: Task description required[/red]")
            console.print("Usage: python vibe.py task \"<description>\"")
            return 1

        task_description = args[1]

        # Parse options
        force_agent = None
        include_context = True

        if '--api' in args:
            force_agent = 'api'
        elif '--cli' in args:
            force_agent = 'cli'
        elif '--antigravity' in args:
            force_agent = 'antigravity'

        if '--no-context' in args:
            include_context = False

        # Execute task
        result = orchestrator.execute_task(
            task_description,
            force_agent=force_agent,
            include_context=include_context
        )

        return 0 if result.get('success') else 1

    # Interactive mode
    if command == 'interactive':
        show_banner()
        orchestrator.interactive_mode()
        return 0

    # Stats command
    if command == 'stats':
        orchestrator.display_stats()
        return 0

    # Context command
    if command == 'context':
        from core.context_manager import get_context_manager
        ctx = get_context_manager(str(PROJECT_ROOT))
        console.print(Panel(
            ctx.get_full_context_for_agent(),
            title="Project Context",
            border_style="blue"
        ))
        return 0

    # Route command - explain routing
    if command == 'route':
        if len(args) < 2:
            console.print("[red]Error: Task description required[/red]")
            return 1

        task = args[1]
        explanation = TaskRouter.explain_routing(task)
        console.print(Panel(explanation, title="Routing Analysis"))
        return 0

    # Unknown command
    console.print(f"[red]Unknown command: {command}[/red]")
    show_help()
    return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        console.print("\n[yellow]Interrupted[/yellow]")
        sys.exit(130)
    except Exception as e:
        console.print(f"[red]Fatal error: {e}[/red]")
        sys.exit(1)
