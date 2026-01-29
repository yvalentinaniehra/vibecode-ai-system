"""
Main Orchestrator - Coordinates all agents
The CONTROL TOWER of the Vibecode AI System
"""
import sys
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

# Fix Windows encoding
if sys.platform == 'win32':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.api_agent import APIAgent
from agents.cli_agent import CLIAgent
from agents.antigravity_agent import AntigravityAgent
from agents.batch_agent import BatchAgent
from core.task_router import TaskRouter, AgentType
from core.context_manager import get_context_manager
from utils.logger import get_logger
from utils.cost_tracker import get_cost_tracker

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console(force_terminal=True)


class Orchestrator:
    """
    Main orchestrator that coordinates all agents and manages context
    """

    def __init__(self, project_path: str = None):
        self.project_path = Path(project_path or Path.cwd())

        # Initialize context manager
        self.context = get_context_manager(str(self.project_path))

        # Initialize utilities
        self.logger = get_logger("orchestrator", str(self.project_path))
        self.cost_tracker = get_cost_tracker(str(self.project_path))

        # Initialize agents (lazy loading)
        self._api_agent = None
        self._cli_agent = None
        self._antigravity_agent = None
        self._batch_agent = None

        # Session stats
        self.session_start = datetime.now()
        self.tasks_executed = 0

        self.logger.info("Orchestrator initialized", project=str(self.project_path))

    @property
    def api_agent(self) -> APIAgent:
        """Lazy load API agent"""
        if self._api_agent is None:
            self._api_agent = APIAgent()
        return self._api_agent

    @property
    def cli_agent(self) -> CLIAgent:
        """Lazy load CLI agent"""
        if self._cli_agent is None:
            self._cli_agent = CLIAgent(str(self.project_path))
        return self._cli_agent

    @property
    def antigravity_agent(self) -> AntigravityAgent:
        """Lazy load Antigravity agent"""
        if self._antigravity_agent is None:
            self._antigravity_agent = AntigravityAgent(str(self.project_path))
        return self._antigravity_agent

    @property
    def batch_agent(self) -> BatchAgent:
        """Lazy load Batch agent"""
        if self._batch_agent is None:
            self._batch_agent = BatchAgent(str(self.project_path))
        return self._batch_agent

    def execute_task(
        self,
        task_description: str,
        force_agent: str = None,
        include_context: bool = True
    ) -> Dict[str, Any]:
        """
        Execute a task by routing to appropriate agent

        Args:
            task_description: Natural language task description
            force_agent: Force specific agent ('api', 'cli', 'antigravity')
            include_context: Whether to include project context

        Returns:
            Dict with execution results
        """
        # Display task
        console.print(Panel(
            f"[bold cyan]Task:[/bold cyan] {task_description}",
            title="🎯 Orchestrator",
            border_style="cyan"
        ))

        # Route to agent
        if force_agent:
            try:
                agent_type = AgentType(force_agent)
                console.print(f"[yellow]⚡ Forced agent: {agent_type.value}[/yellow]")
            except ValueError:
                console.print(f"[red]Unknown agent: {force_agent}. Using auto-routing.[/red]")
                agent_type, confidence = TaskRouter.route(task_description)
        else:
            agent_type, confidence = TaskRouter.route(task_description)
            console.print(f"[dim]🧠 Auto-routed: {agent_type.value} ({confidence:.0%} confidence)[/dim]")

        # Get project context
        full_context = ""
        if include_context:
            full_context = self.context.get_full_context_for_agent()

        # Execute with appropriate agent
        start_time = datetime.now()

        if agent_type == AgentType.API:
            result = self.api_agent.execute(task_description, full_context)
        elif agent_type == AgentType.CLI:
            result = self.cli_agent.execute(task_description, full_context)
        elif agent_type == AgentType.ANTIGRAVITY:
            # Parse batch operation from task description
            result = self._execute_antigravity_task(task_description)
        elif agent_type == AgentType.BATCH:
            # Execute batch operations
            result = self._execute_batch_task(task_description)
        else:
            result = {
                "success": False,
                "error": f"Agent type '{agent_type.value}' not implemented yet",
                "result": None
            }

        # Calculate execution time
        execution_time = (datetime.now() - start_time).total_seconds()

        # Update stats
        self.tasks_executed += 1

        # Log completed task to context
        self.context.add_completed_task({
            "description": task_description[:100],
            "agent": agent_type.value,
            "success": result.get("success", False),
            "execution_time": execution_time
        })

        # Display result
        if result.get("success"):
            output = result.get("result", "")
            # Truncate long outputs
            if len(output) > 1000:
                display_output = output[:1000] + f"\n\n[dim]... ({len(output) - 1000} more characters)[/dim]"
            else:
                display_output = output

            console.print(Panel(
                display_output,
                title=f"✅ Result ({execution_time:.1f}s)",
                border_style="green"
            ))
        else:
            console.print(Panel(
                f"[red]{result.get('error', 'Unknown error')}[/red]",
                title="❌ Error",
                border_style="red"
            ))

        return {
            **result,
            "agent_used": agent_type.value,
            "execution_time": execution_time
        }

    def get_session_stats(self) -> Dict[str, Any]:
        """Get current session statistics"""
        session_duration = (datetime.now() - self.session_start).total_seconds()

        stats = {
            "session_duration": session_duration,
            "tasks_executed": self.tasks_executed,
            "project": self.context.get("project_name"),
        }

        if self._api_agent:
            stats["api_cost"] = self._api_agent.get_total_cost()
            stats["api_requests"] = self._api_agent.total_requests

        return stats

    def display_stats(self):
        """Display session statistics"""
        stats = self.get_session_stats()

        table = Table(title="📊 Session Statistics")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")

        table.add_row("Project", stats.get("project", "Unknown"))
        table.add_row("Session Duration", f"{stats['session_duration']:.0f}s")
        table.add_row("Tasks Executed", str(stats['tasks_executed']))

        if "api_cost" in stats:
            table.add_row("API Cost", f"${stats['api_cost']:.4f}")
            table.add_row("API Requests", str(stats['api_requests']))

        console.print(table)

    def set_tech_stack(self, technologies: list):
        """Update project tech stack"""
        self.context.update_tech_stack(technologies)
        console.print(f"[green]✅ Tech stack updated: {', '.join(technologies)}[/green]")

    def set_convention(self, key: str, value: str):
        """Set a project convention"""
        self.context.set(f"conventions.{key}", value)
        console.print(f"[green]✅ Convention set: {key} = {value}[/green]")

    def interactive_mode(self):
        """Start interactive REPL mode"""
        console.print(Panel(
            "[bold cyan]Vibecode AI System[/bold cyan]\n"
            "Type your tasks or commands. Type 'exit' to quit, 'stats' for statistics.",
            title="🚀 Interactive Mode",
            border_style="cyan"
        ))

        while True:
            try:
                user_input = console.input("\n[bold green]>>> [/bold green]").strip()

                if not user_input:
                    continue

                if user_input.lower() == 'exit':
                    self.display_stats()
                    console.print("[yellow]👋 Goodbye![/yellow]")
                    break

                if user_input.lower() == 'stats':
                    self.display_stats()
                    continue

                if user_input.lower() == 'help':
                    self._show_help()
                    continue

                # Execute task
                self.execute_task(user_input)

            except KeyboardInterrupt:
                console.print("\n[yellow]Use 'exit' to quit properly[/yellow]")
            except Exception as e:
                console.print(f"[red]Error: {e}[/red]")

    def _show_help(self):
        """Show help message"""
        console.print(Panel(
            """[bold]Commands:[/bold]
• Type any task to execute it
• 'stats' - Show session statistics
• 'exit' - Exit interactive mode

[bold]Task Examples:[/bold]
• "Analyze the architecture of this project"
• "Implement a login form with validation"
• "Explain how the context manager works"
• "Review the code quality"
""",
            title="Help",
            border_style="blue"
        ))

    def _execute_antigravity_task(self, task_description: str) -> Dict[str, Any]:
        """Parse and execute Antigravity batch operations"""
        task_lower = task_description.lower()

        # Detect operation type from task description
        if 'scaffold' in task_lower or 'create project' in task_lower:
            # Extract project name if mentioned
            return self.antigravity_agent.execute('scaffold', options={
                'template': 'basic',
                'name': 'new-project',
                'dry_run': False
            })
        elif 'rename' in task_lower:
            return self.antigravity_agent.execute('rename', ['**/*'], options={'dry_run': True})
        elif 'find' in task_lower or 'search' in task_lower:
            return self.antigravity_agent.execute('find', ['**/*'])
        elif 'move' in task_lower:
            return self.antigravity_agent.execute('move', ['**/*'], options={'dry_run': True})
        elif 'copy' in task_lower:
            return self.antigravity_agent.execute('copy', ['**/*'], options={'dry_run': True})
        else:
            return {
                "success": True,
                "result": f"Antigravity agent ready. Available operations: scaffold, rename, find, move, copy, transform",
                "agent": "antigravity"
            }

    def _execute_batch_task(self, task_description: str) -> Dict[str, Any]:
        """Parse and execute Batch operations"""
        task_lower = task_description.lower()

        # Detect operation type from task description
        if 'transform' in task_lower or 'replace' in task_lower:
            return self.batch_agent.execute('parallel_transform', ['**/*.py', '**/*.js'], options={'dry_run': True})
        elif 'sync' in task_lower:
            return self.batch_agent.execute('sync', options={'dry_run': True})
        elif 'archive' in task_lower or 'zip' in task_lower:
            return self.batch_agent.execute('archive', ['**/*'], options={'dry_run': True})
        elif 'deduplicate' in task_lower or 'duplicate' in task_lower:
            return self.batch_agent.execute('deduplicate', ['**/*'], options={'dry_run': True})
        elif 'organize' in task_lower:
            return self.batch_agent.execute('organize', ['**/*'], options={'dry_run': True})
        elif 'rename' in task_lower:
            return self.batch_agent.execute('bulk_rename', ['**/*'], options={'dry_run': True})
        elif 'pipeline' in task_lower:
            return self.batch_agent.execute('pipeline', options={'steps': []})
        elif 'rollback' in task_lower:
            return self.batch_agent.execute('rollback')
        elif 'status' in task_lower:
            return self.batch_agent.execute('status')
        else:
            return {
                "success": True,
                "result": "Batch agent ready. Available operations: parallel_transform, pipeline, bulk_rename, sync, archive, extract, deduplicate, organize, rollback, status",
                "agent": "batch"
            }

    def batch_operation(
        self,
        operation: str,
        patterns: list = None,
        options: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Execute a batch operation directly"""
        self.logger.info(f"Batch operation: {operation}", patterns=patterns)
        return self.antigravity_agent.execute(operation, patterns, options)

    def display_cost_report(self, period: str = "session"):
        """Display cost report"""
        self.cost_tracker.display_report(period)
