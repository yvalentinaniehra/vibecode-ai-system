"""
Workflow Engine - Execute YAML-defined workflows
Automates multi-step tasks with agent coordination
"""
import sys
import yaml
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum

# Fix Windows encoding
if sys.platform == 'win32':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.orchestrator import Orchestrator
from core.context_manager import get_context_manager
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
from rich.table import Table

console = Console(force_terminal=True)


class StepStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class WorkflowStep:
    """Represents a single step in a workflow"""

    def __init__(self, config: Dict[str, Any]):
        self.id = config.get('id', 'unnamed')
        self.name = config.get('name', self.id)
        self.description = config.get('description', '')
        self.agent = config.get('agent', 'auto')  # auto, api, cli
        self.prompt = config.get('prompt', '')
        self.depends_on = config.get('depends_on', [])
        self.condition = config.get('condition', None)
        self.timeout = config.get('timeout', 300)
        self.retry = config.get('retry', 0)
        self.save_output = config.get('save_output', None)

        self.status = StepStatus.PENDING
        self.result = None
        self.error = None
        self.execution_time = 0.0


class Workflow:
    """Workflow definition and execution"""

    def __init__(self, config: Dict[str, Any]):
        self.name = config.get('name', 'Unnamed Workflow')
        self.description = config.get('description', '')
        self.version = config.get('version', '1.0.0')
        self.author = config.get('author', 'Unknown')
        self.tags = config.get('tags', [])

        # Parse variables
        self.variables = config.get('variables', {})

        # Parse steps
        self.steps: List[WorkflowStep] = []
        for step_config in config.get('steps', []):
            self.steps.append(WorkflowStep(step_config))

        # Execution state
        self.started_at = None
        self.completed_at = None
        self.outputs: Dict[str, Any] = {}

    @classmethod
    def from_file(cls, filepath: str) -> 'Workflow':
        """Load workflow from YAML file"""
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"Workflow file not found: {filepath}")

        with open(path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        return cls(config)

    def get_step(self, step_id: str) -> Optional[WorkflowStep]:
        """Get step by ID"""
        for step in self.steps:
            if step.id == step_id:
                return step
        return None


class WorkflowEngine:
    """Executes workflows with agent coordination"""

    def __init__(self, project_path: str = None):
        self.project_path = Path(project_path or Path.cwd())
        self.orchestrator = Orchestrator(str(self.project_path))
        self.context = get_context_manager(str(self.project_path))

        # Workflow state
        self.current_workflow: Optional[Workflow] = None
        self.execution_log: List[Dict[str, Any]] = []

    def load_workflow(self, workflow_path: str) -> Workflow:
        """Load a workflow from file"""
        workflow = Workflow.from_file(workflow_path)
        self.current_workflow = workflow
        console.print(Panel(
            f"[bold]{workflow.name}[/bold]\n"
            f"[dim]{workflow.description}[/dim]\n\n"
            f"Steps: {len(workflow.steps)} | Version: {workflow.version}",
            title="Workflow Loaded",
            border_style="cyan"
        ))
        return workflow

    def execute(self, workflow: Workflow = None, dry_run: bool = False) -> Dict[str, Any]:
        """Execute a workflow"""
        if workflow:
            self.current_workflow = workflow

        if not self.current_workflow:
            raise ValueError("No workflow loaded")

        wf = self.current_workflow
        wf.started_at = datetime.now()

        console.print(Panel(
            f"[bold cyan]Starting: {wf.name}[/bold cyan]\n"
            f"Steps: {len(wf.steps)}",
            title="Workflow Execution",
            border_style="green"
        ))

        # Execute each step
        results = []
        failed = False

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            console=console
        ) as progress:
            task = progress.add_task(f"Running {wf.name}", total=len(wf.steps))

            for i, step in enumerate(wf.steps):
                if failed and not self._should_run_on_failure(step):
                    step.status = StepStatus.SKIPPED
                    progress.advance(task)
                    continue

                # Check dependencies
                if not self._check_dependencies(step, wf):
                    step.status = StepStatus.SKIPPED
                    progress.advance(task)
                    continue

                # Execute step
                progress.update(task, description=f"[cyan]{step.name}[/cyan]")

                if dry_run:
                    console.print(f"[dim]DRY RUN: Would execute '{step.name}'[/dim]")
                    step.status = StepStatus.COMPLETED
                else:
                    result = self._execute_step(step, wf)
                    results.append(result)

                    if not result.get('success'):
                        failed = True

                progress.advance(task)

        wf.completed_at = datetime.now()
        execution_time = (wf.completed_at - wf.started_at).total_seconds()

        # Summary
        completed = sum(1 for s in wf.steps if s.status == StepStatus.COMPLETED)
        failed_count = sum(1 for s in wf.steps if s.status == StepStatus.FAILED)
        skipped = sum(1 for s in wf.steps if s.status == StepStatus.SKIPPED)

        summary = {
            "workflow": wf.name,
            "success": failed_count == 0,
            "total_steps": len(wf.steps),
            "completed": completed,
            "failed": failed_count,
            "skipped": skipped,
            "execution_time": execution_time,
            "outputs": wf.outputs
        }

        # Display summary
        self._display_summary(summary)

        # Log to context
        self.context.add_completed_task({
            "type": "workflow",
            "name": wf.name,
            "success": summary["success"],
            "execution_time": execution_time
        })

        return summary

    def _execute_step(self, step: WorkflowStep, workflow: Workflow) -> Dict[str, Any]:
        """Execute a single step"""
        step.status = StepStatus.RUNNING
        start_time = datetime.now()

        console.print(f"\n[bold]Step: {step.name}[/bold]")
        if step.description:
            console.print(f"[dim]{step.description}[/dim]")

        # Interpolate variables in prompt
        prompt = self._interpolate_prompt(step.prompt, workflow)

        # Determine agent
        force_agent = None if step.agent == 'auto' else step.agent

        # Execute with retry
        attempts = 0
        max_attempts = step.retry + 1
        result = None

        while attempts < max_attempts:
            attempts += 1

            try:
                result = self.orchestrator.execute_task(
                    prompt,
                    force_agent=force_agent,
                    include_context=True
                )

                if result.get('success'):
                    break

            except Exception as e:
                result = {"success": False, "error": str(e)}

            if attempts < max_attempts:
                console.print(f"[yellow]Retry {attempts}/{step.retry}...[/yellow]")

        # Update step state
        step.execution_time = (datetime.now() - start_time).total_seconds()

        if result and result.get('success'):
            step.status = StepStatus.COMPLETED
            step.result = result.get('result')

            # Save output if configured
            if step.save_output:
                workflow.outputs[step.save_output] = step.result
        else:
            step.status = StepStatus.FAILED
            step.error = result.get('error') if result else "Unknown error"

        return {
            "step_id": step.id,
            "success": step.status == StepStatus.COMPLETED,
            "result": step.result,
            "error": step.error,
            "execution_time": step.execution_time
        }

    def _interpolate_prompt(self, prompt: str, workflow: Workflow) -> str:
        """Replace variables in prompt"""
        result = prompt

        # Replace workflow variables
        for key, value in workflow.variables.items():
            result = result.replace(f"${{{key}}}", str(value))
            result = result.replace(f"${key}", str(value))

        # Replace outputs from previous steps
        for key, value in workflow.outputs.items():
            result = result.replace(f"${{outputs.{key}}}", str(value))

        return result

    def _check_dependencies(self, step: WorkflowStep, workflow: Workflow) -> bool:
        """Check if step dependencies are satisfied"""
        for dep_id in step.depends_on:
            dep_step = workflow.get_step(dep_id)
            if not dep_step or dep_step.status != StepStatus.COMPLETED:
                return False
        return True

    def _should_run_on_failure(self, step: WorkflowStep) -> bool:
        """Check if step should run even after failure"""
        # Could be extended to support 'always' or 'on_failure' conditions
        return False

    def _display_summary(self, summary: Dict[str, Any]):
        """Display execution summary"""
        table = Table(title="Workflow Summary")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")

        status = "[green]SUCCESS[/green]" if summary["success"] else "[red]FAILED[/red]"
        table.add_row("Status", status)
        table.add_row("Workflow", summary["workflow"])
        table.add_row("Total Steps", str(summary["total_steps"]))
        table.add_row("Completed", str(summary["completed"]))
        table.add_row("Failed", str(summary["failed"]))
        table.add_row("Skipped", str(summary["skipped"]))
        table.add_row("Execution Time", f"{summary['execution_time']:.1f}s")

        console.print(table)

    def list_workflows(self, directory: str = None) -> List[Dict[str, Any]]:
        """List available workflows"""
        workflows_dir = Path(directory) if directory else self.project_path / "workflows"

        if not workflows_dir.exists():
            return []

        workflows = []
        for yaml_file in workflows_dir.glob("*.yaml"):
            try:
                wf = Workflow.from_file(str(yaml_file))
                workflows.append({
                    "file": yaml_file.name,
                    "name": wf.name,
                    "description": wf.description,
                    "steps": len(wf.steps),
                    "version": wf.version
                })
            except Exception as e:
                workflows.append({
                    "file": yaml_file.name,
                    "error": str(e)
                })

        return workflows


def run_workflow(workflow_path: str, project_path: str = None, dry_run: bool = False):
    """Convenience function to run a workflow"""
    engine = WorkflowEngine(project_path)
    workflow = engine.load_workflow(workflow_path)
    return engine.execute(workflow, dry_run=dry_run)
