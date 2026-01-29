"""
Unit tests for Context Manager
"""
import pytest
import json
from pathlib import Path
from core.context_manager import ContextManager, get_context_manager, reset_context_manager


class TestContextManager:
    """Test ContextManager functionality"""

    def test_init_creates_directories(self, temp_project_dir):
        """Test that initialization creates required directories"""
        ctx = ContextManager(str(temp_project_dir))

        assert (temp_project_dir / ".vibecode").exists()
        assert (temp_project_dir / ".vibecode" / "history").exists()

    def test_init_creates_default_context(self, temp_project_dir):
        """Test that initialization creates default context structure"""
        ctx = ContextManager(str(temp_project_dir))

        assert ctx.context is not None
        assert "project_name" in ctx.context
        assert "tech_stack" in ctx.context
        assert "completed_tasks" in ctx.context
        assert ctx.context["project_name"] == temp_project_dir.name

    def test_get_simple_key(self, temp_project_dir):
        """Test getting a simple key"""
        ctx = ContextManager(str(temp_project_dir))

        result = ctx.get("project_name")
        assert result == temp_project_dir.name

    def test_get_nested_key(self, temp_project_dir):
        """Test getting a nested key"""
        ctx = ContextManager(str(temp_project_dir))
        ctx.context["conventions"] = {"naming": "snake_case"}

        result = ctx.get("conventions.naming")
        assert result == "snake_case"

    def test_get_missing_key_returns_default(self, temp_project_dir):
        """Test getting a missing key returns default"""
        ctx = ContextManager(str(temp_project_dir))

        result = ctx.get("nonexistent", "default_value")
        assert result == "default_value"

    def test_set_simple_key(self, temp_project_dir):
        """Test setting a simple key"""
        ctx = ContextManager(str(temp_project_dir))

        ctx.set("custom_key", "custom_value")
        assert ctx.get("custom_key") == "custom_value"

    def test_set_nested_key(self, temp_project_dir):
        """Test setting a nested key"""
        ctx = ContextManager(str(temp_project_dir))

        ctx.set("settings.theme", "dark")
        assert ctx.get("settings.theme") == "dark"

    def test_set_saves_to_disk(self, temp_project_dir):
        """Test that set operation saves to disk"""
        ctx = ContextManager(str(temp_project_dir))

        ctx.set("persistent_key", "persistent_value")

        # Read directly from file
        context_file = temp_project_dir / ".vibecode" / "context.json"
        with open(context_file, 'r', encoding='utf-8') as f:
            saved_context = json.load(f)

        assert saved_context["persistent_key"] == "persistent_value"

    def test_add_completed_task(self, temp_project_dir):
        """Test adding a completed task"""
        ctx = ContextManager(str(temp_project_dir))

        task = {"description": "Test task", "success": True}
        ctx.add_completed_task(task)

        assert len(ctx.context["completed_tasks"]) == 1
        assert ctx.context["completed_tasks"][0]["description"] == "Test task"
        assert "completed_at" in ctx.context["completed_tasks"][0]

    def test_add_completed_task_limits_history(self, temp_project_dir):
        """Test that completed tasks are limited to 50"""
        ctx = ContextManager(str(temp_project_dir))

        # Add 60 tasks
        for i in range(60):
            ctx.add_completed_task({"description": f"Task {i}"})

        assert len(ctx.context["completed_tasks"]) == 50
        # Should keep the most recent
        assert ctx.context["completed_tasks"][-1]["description"] == "Task 59"

    def test_update_tech_stack(self, temp_project_dir):
        """Test updating tech stack"""
        ctx = ContextManager(str(temp_project_dir))

        ctx.update_tech_stack(["Python", "React", "PostgreSQL"])

        assert ctx.context["tech_stack"] == ["Python", "React", "PostgreSQL"]

    def test_get_full_context_for_agent(self, temp_project_dir):
        """Test getting formatted context for agents"""
        ctx = ContextManager(str(temp_project_dir))
        ctx.update_tech_stack(["Python", "FastAPI"])

        context_str = ctx.get_full_context_for_agent()

        assert "Python" in context_str
        assert "FastAPI" in context_str
        assert "Project Context" in context_str

    def test_clear_history(self, temp_project_dir):
        """Test clearing history files"""
        ctx = ContextManager(str(temp_project_dir))

        # Create some history by saving multiple times
        ctx.set("key1", "value1")
        ctx.set("key2", "value2")

        # Should have history files
        history_dir = temp_project_dir / ".vibecode" / "history"
        history_files_before = list(history_dir.glob("*.json"))
        assert len(history_files_before) > 0

        ctx.clear_history()

        history_files_after = list(history_dir.glob("*.json"))
        assert len(history_files_after) == 0

    def test_load_existing_context(self, temp_project_dir):
        """Test loading existing context from disk"""
        # Create initial context
        context_dir = temp_project_dir / ".vibecode"
        context_dir.mkdir(exist_ok=True)
        context_file = context_dir / "context.json"

        existing_context = {
            "project_name": "existing-project",
            "tech_stack": ["Rust"],
            "custom_data": "preserved"
        }

        with open(context_file, 'w', encoding='utf-8') as f:
            json.dump(existing_context, f)

        # Reset singleton and create new instance
        reset_context_manager()
        ContextManager._instance = None

        ctx = ContextManager(str(temp_project_dir))

        assert ctx.get("project_name") == "existing-project"
        assert ctx.get("tech_stack") == ["Rust"]
        assert ctx.get("custom_data") == "preserved"


class TestContextManagerSingleton:
    """Test singleton behavior"""

    def test_get_context_manager_returns_singleton(self, temp_project_dir):
        """Test that get_context_manager returns the same instance"""
        ctx1 = get_context_manager(str(temp_project_dir))
        ctx2 = get_context_manager(str(temp_project_dir))

        assert ctx1 is ctx2

    def test_reset_context_manager(self, temp_project_dir):
        """Test resetting the singleton"""
        ctx1 = get_context_manager(str(temp_project_dir))
        reset_context_manager()

        # After reset, _instance should be None
        assert ContextManager._instance is None
