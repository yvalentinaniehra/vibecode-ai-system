"""
Claude Code CLI Agent - Code execution
Handles: implement, code, write, create, build, debug, fix, refactor, test
"""
import subprocess
import os
import shutil
from pathlib import Path
from typing import Dict, Any, Optional
from rich.console import Console

console = Console()


class CLIAgent:
    """Claude Code CLI wrapper for code execution tasks"""

    def __init__(self, project_path: str = None, cli_path: str = None):
        self.project_path = Path(project_path or os.getcwd())
        self.cli_path = cli_path or os.getenv("CLAUDE_CODE_PATH", "claude-code")

        # Verify CLI is available
        self._verify_cli()

    def _verify_cli(self):
        """Check if claude-code CLI is available"""
        cli_found = shutil.which(self.cli_path)
        if not cli_found:
            console.print(f"[yellow]⚠️ Warning: {self.cli_path} not found in PATH[/yellow]")
            console.print("[dim]CLI Agent may not work properly[/dim]")

    def execute(
        self,
        command: str,
        context: str = "",
        timeout: int = 300,
        working_dir: str = None
    ) -> Dict[str, Any]:
        """
        Execute a command using Claude Code CLI

        Args:
            command: The command/task to execute
            context: Optional context to pipe into the command
            timeout: Timeout in seconds (default 5 minutes)
            working_dir: Optional working directory override

        Returns:
            Dict with success, result, error, returncode
        """
        console.print(f"[green]⚡ CLI Agent executing...[/green]")

        work_dir = Path(working_dir) if working_dir else self.project_path

        # Build command
        if context:
            # Pipe context into claude-code
            full_cmd = f'echo "{self._escape_string(context)}" | {self.cli_path} "{command}"'
        else:
            full_cmd = f'{self.cli_path} "{command}"'

        try:
            # Execute command
            result = subprocess.run(
                full_cmd,
                shell=True,
                capture_output=True,
                text=True,
                cwd=work_dir,
                timeout=timeout,
                env={**os.environ, "FORCE_COLOR": "0"}  # Disable colors for clean output
            )

            success = result.returncode == 0

            if success:
                console.print(f"[green]✅ CLI Success[/green]")
            else:
                console.print(f"[red]❌ CLI Failed (code: {result.returncode})[/red]")

            return {
                "success": success,
                "result": result.stdout,
                "error": result.stderr,
                "returncode": result.returncode,
                "command": command
            }

        except subprocess.TimeoutExpired:
            console.print(f"[red]❌ CLI Timeout after {timeout}s[/red]")
            return {
                "success": False,
                "error": f"Command timed out after {timeout} seconds",
                "result": None,
                "returncode": -1
            }

        except Exception as e:
            console.print(f"[red]❌ CLI Error: {str(e)}[/red]")
            return {
                "success": False,
                "error": str(e),
                "result": None,
                "returncode": -1
            }

    def _escape_string(self, s: str) -> str:
        """Escape string for shell"""
        return s.replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')

    def execute_script(
        self,
        script_path: str,
        args: list = None,
        timeout: int = 300
    ) -> Dict[str, Any]:
        """
        Execute a script file

        Args:
            script_path: Path to the script
            args: Optional list of arguments
            timeout: Timeout in seconds
        """
        console.print(f"[green]⚡ CLI Agent running script: {script_path}[/green]")

        script = Path(script_path)
        if not script.exists():
            return {
                "success": False,
                "error": f"Script not found: {script_path}"
            }

        # Build command based on extension
        ext = script.suffix.lower()
        if ext == '.py':
            cmd = f'python "{script_path}"'
        elif ext == '.js':
            cmd = f'node "{script_path}"'
        elif ext == '.sh':
            cmd = f'bash "{script_path}"'
        elif ext == '.ps1':
            cmd = f'powershell -File "{script_path}"'
        else:
            cmd = f'"{script_path}"'

        # Add arguments
        if args:
            cmd += ' ' + ' '.join(f'"{a}"' for a in args)

        try:
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                cwd=self.project_path,
                timeout=timeout
            )

            return {
                "success": result.returncode == 0,
                "result": result.stdout,
                "error": result.stderr,
                "returncode": result.returncode
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    def run_command(
        self,
        command: str,
        timeout: int = 60
    ) -> Dict[str, Any]:
        """
        Run a raw shell command (not through claude-code)

        Args:
            command: Shell command to run
            timeout: Timeout in seconds
        """
        console.print(f"[blue]🔧 Running: {command[:50]}...[/blue]")

        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                cwd=self.project_path,
                timeout=timeout
            )

            return {
                "success": result.returncode == 0,
                "result": result.stdout,
                "error": result.stderr,
                "returncode": result.returncode
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    def list_files(self, pattern: str = "*") -> list:
        """List files matching pattern in project directory"""
        return list(self.project_path.glob(pattern))

    def read_file(self, filepath: str) -> Optional[str]:
        """Read a file from project directory"""
        try:
            full_path = self.project_path / filepath
            return full_path.read_text(encoding='utf-8')
        except Exception as e:
            console.print(f"[red]Error reading {filepath}: {e}[/red]")
            return None
