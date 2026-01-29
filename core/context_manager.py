"""
Context Manager - Shared memory across all agents
The NERVOUS SYSTEM of the Vibecode AI System
"""
import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
import threading


class ContextManager:
    """Centralized context store with thread-safe operations"""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, project_path: str = None):
        if hasattr(self, '_initialized'):
            return

        self.project_path = Path(project_path or os.getcwd())
        self.context_dir = self.project_path / ".vibecode"
        self.context_file = self.context_dir / "context.json"
        self.history_dir = self.context_dir / "history"

        # Ensure directories exist
        self.context_dir.mkdir(exist_ok=True)
        self.history_dir.mkdir(exist_ok=True)

        # Load or initialize context
        self.context = self._load_context()
        self._initialized = True

    def _load_context(self) -> Dict[str, Any]:
        """Load context from disk or create new"""
        if self.context_file.exists():
            try:
                with open(self.context_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                pass

        # Default context structure
        return {
            "project_name": self.project_path.name,
            "created_at": datetime.now().isoformat(),
            "tech_stack": [],
            "architecture": {},
            "conventions": {},
            "active_tasks": {},
            "completed_tasks": [],
            "knowledge_base": {}
        }

    def _save_context(self):
        """Save context to disk with history backup"""
        self.context["updated_at"] = datetime.now().isoformat()

        # Save main context file
        with open(self.context_file, 'w', encoding='utf-8') as f:
            json.dump(self.context, f, indent=2, ensure_ascii=False)

        # Save history snapshot
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        history_file = self.history_dir / f"context_{timestamp}.json"
        with open(history_file, 'w', encoding='utf-8') as f:
            json.dump(self.context, f, indent=2, ensure_ascii=False)

    def get(self, key: str, default: Any = None) -> Any:
        """Get value by key (supports nested keys like 'conventions.naming')"""
        keys = key.split('.')
        value = self.context

        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        return value

    def set(self, key: str, value: Any):
        """Set value by key (supports nested keys) and auto-save"""
        keys = key.split('.')
        target = self.context

        for k in keys[:-1]:
            if k not in target:
                target[k] = {}
            target = target[k]

        target[keys[-1]] = value
        self._save_context()

    def add_completed_task(self, task: Dict[str, Any]):
        """Add a completed task to history"""
        task["completed_at"] = datetime.now().isoformat()
        self.context["completed_tasks"].append(task)

        # Keep only last 50 tasks
        if len(self.context["completed_tasks"]) > 50:
            self.context["completed_tasks"] = self.context["completed_tasks"][-50:]

        self._save_context()

    def get_full_context_for_agent(self) -> str:
        """Export formatted context string for agents"""
        recent_tasks = self.context.get('completed_tasks', [])[-3:]
        tech_stack = ', '.join(self.context.get('tech_stack', [])) or 'Not defined'

        return f"""
# Project Context

## Overview
- Project: {self.context.get('project_name')}
- Tech Stack: {tech_stack}
- Last Updated: {self.context.get('updated_at', 'Never')}

## Conventions
{json.dumps(self.context.get('conventions', {}), indent=2)}

## Recent Tasks (Last 3)
{json.dumps(recent_tasks, indent=2)}

## Knowledge Base
{json.dumps(self.context.get('knowledge_base', {}), indent=2)}
"""

    def update_tech_stack(self, technologies: list):
        """Update the tech stack"""
        self.context["tech_stack"] = technologies
        self._save_context()

    def clear_history(self):
        """Clear history files (keep current context)"""
        for f in self.history_dir.glob("*.json"):
            f.unlink()


# Singleton accessor
_context_manager: Optional[ContextManager] = None


def get_context_manager(project_path: str = None) -> ContextManager:
    """Get the singleton ContextManager instance"""
    global _context_manager
    if _context_manager is None:
        _context_manager = ContextManager(project_path)
    return _context_manager


def reset_context_manager():
    """Reset the singleton (useful for testing)"""
    global _context_manager
    _context_manager = None
    ContextManager._instance = None
