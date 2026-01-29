"""
Logger - Comprehensive logging system for Vibecode
Provides structured logging with rotation and filtering
"""
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
from enum import Enum
import threading

# Fix Windows encoding
if sys.platform == 'win32':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from rich.console import Console
from rich.panel import Panel

console = Console(force_terminal=True)


class LogLevel(Enum):
    DEBUG = 10
    INFO = 20
    WARNING = 30
    ERROR = 40
    CRITICAL = 50


class Logger:
    """Structured logger with file rotation"""

    def __init__(
        self,
        name: str = "vibecode",
        project_path: str = None,
        level: LogLevel = LogLevel.INFO,
        max_file_size: int = 10 * 1024 * 1024,  # 10MB
        max_files: int = 5
    ):
        self.name = name
        self.project_path = Path(project_path or os.getcwd())
        self.log_dir = self.project_path / "logs"
        self.log_dir.mkdir(parents=True, exist_ok=True)

        self.level = level
        self.max_file_size = max_file_size
        self.max_files = max_files

        self.current_file = self.log_dir / f"{name}_{datetime.now().strftime('%Y%m%d')}.log"
        self._lock = threading.Lock()

        # Session info
        self.session_id = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.session_logs: list = []

    def _should_log(self, level: LogLevel) -> bool:
        """Check if message should be logged based on level"""
        return level.value >= self.level.value

    def _rotate_if_needed(self):
        """Rotate log file if it exceeds max size"""
        if self.current_file.exists():
            if self.current_file.stat().st_size > self.max_file_size:
                # Rotate files
                for i in range(self.max_files - 1, 0, -1):
                    old_file = self.log_dir / f"{self.name}_{datetime.now().strftime('%Y%m%d')}_{i}.log"
                    new_file = self.log_dir / f"{self.name}_{datetime.now().strftime('%Y%m%d')}_{i+1}.log"
                    if old_file.exists():
                        old_file.rename(new_file)

                self.current_file.rename(
                    self.log_dir / f"{self.name}_{datetime.now().strftime('%Y%m%d')}_1.log"
                )

    def _write_log(self, entry: Dict[str, Any]):
        """Write log entry to file"""
        with self._lock:
            self._rotate_if_needed()

            with open(self.current_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(entry, ensure_ascii=False) + '\n')

            self.session_logs.append(entry)

    def _create_entry(
        self,
        level: LogLevel,
        message: str,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create a log entry"""
        return {
            "timestamp": datetime.now().isoformat(),
            "level": level.name,
            "session_id": self.session_id,
            "logger": self.name,
            "message": message,
            "context": context or {}
        }

    def debug(self, message: str, **context):
        """Log debug message"""
        if self._should_log(LogLevel.DEBUG):
            entry = self._create_entry(LogLevel.DEBUG, message, context)
            self._write_log(entry)

    def info(self, message: str, **context):
        """Log info message"""
        if self._should_log(LogLevel.INFO):
            entry = self._create_entry(LogLevel.INFO, message, context)
            self._write_log(entry)

    def warning(self, message: str, **context):
        """Log warning message"""
        if self._should_log(LogLevel.WARNING):
            entry = self._create_entry(LogLevel.WARNING, message, context)
            self._write_log(entry)
            console.print(f"[yellow]⚠️ {message}[/yellow]")

    def error(self, message: str, **context):
        """Log error message"""
        if self._should_log(LogLevel.ERROR):
            entry = self._create_entry(LogLevel.ERROR, message, context)
            self._write_log(entry)
            console.print(f"[red]❌ {message}[/red]")

    def critical(self, message: str, **context):
        """Log critical message"""
        if self._should_log(LogLevel.CRITICAL):
            entry = self._create_entry(LogLevel.CRITICAL, message, context)
            self._write_log(entry)
            console.print(Panel(f"[bold red]CRITICAL: {message}[/bold red]", border_style="red"))

    def task_start(self, task_id: str, description: str, agent: str = None):
        """Log task start"""
        self.info(
            f"Task started: {description}",
            task_id=task_id,
            agent=agent,
            event="task_start"
        )

    def task_complete(self, task_id: str, success: bool, duration: float = None, cost: float = None):
        """Log task completion"""
        self.info(
            f"Task completed: {'success' if success else 'failed'}",
            task_id=task_id,
            success=success,
            duration=duration,
            cost=cost,
            event="task_complete"
        )

    def workflow_start(self, workflow_name: str, steps: int):
        """Log workflow start"""
        self.info(
            f"Workflow started: {workflow_name}",
            workflow=workflow_name,
            total_steps=steps,
            event="workflow_start"
        )

    def workflow_complete(self, workflow_name: str, success: bool, duration: float = None):
        """Log workflow completion"""
        self.info(
            f"Workflow completed: {workflow_name}",
            workflow=workflow_name,
            success=success,
            duration=duration,
            event="workflow_complete"
        )

    def api_call(self, model: str, tokens: Dict[str, int], cost: float):
        """Log API call"""
        self.debug(
            f"API call: {model}",
            model=model,
            tokens=tokens,
            cost=cost,
            event="api_call"
        )

    def get_session_logs(self, level: LogLevel = None) -> list:
        """Get logs from current session"""
        if level:
            return [
                log for log in self.session_logs
                if LogLevel[log['level']].value >= level.value
            ]
        return self.session_logs

    def get_recent_logs(self, count: int = 50, level: LogLevel = None) -> list:
        """Get recent log entries from file"""
        logs = []

        if self.current_file.exists():
            with open(self.current_file, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        entry = json.loads(line.strip())
                        if level is None or LogLevel[entry['level']].value >= level.value:
                            logs.append(entry)
                    except json.JSONDecodeError:
                        continue

        return logs[-count:]

    def search_logs(self, query: str, level: LogLevel = None) -> list:
        """Search logs for matching entries"""
        results = []

        if self.current_file.exists():
            with open(self.current_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if query.lower() in line.lower():
                        try:
                            entry = json.loads(line.strip())
                            if level is None or LogLevel[entry['level']].value >= level.value:
                                results.append(entry)
                        except json.JSONDecodeError:
                            continue

        return results

    def clear_old_logs(self, days: int = 30):
        """Remove log files older than specified days"""
        cutoff = datetime.now().timestamp() - (days * 24 * 60 * 60)
        removed = 0

        for log_file in self.log_dir.glob(f"{self.name}_*.log"):
            if log_file.stat().st_mtime < cutoff:
                log_file.unlink()
                removed += 1

        if removed > 0:
            self.info(f"Cleaned up {removed} old log files", days=days)

        return removed


# Singleton instance
_logger: Optional[Logger] = None


def get_logger(name: str = "vibecode", project_path: str = None) -> Logger:
    """Get singleton Logger instance"""
    global _logger
    if _logger is None:
        _logger = Logger(name, project_path)
    return _logger
