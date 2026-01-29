"""
Pytest configuration and shared fixtures
"""
import pytest
import tempfile
import shutil
from pathlib import Path


@pytest.fixture
def temp_project_dir():
    """Create a temporary project directory for testing"""
    temp_dir = tempfile.mkdtemp(prefix="vibecode_test_")
    yield Path(temp_dir)
    # Cleanup
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def sample_files(temp_project_dir):
    """Create sample files for testing batch operations"""
    # Create some test files
    (temp_project_dir / "src").mkdir()
    (temp_project_dir / "docs").mkdir()

    files = {
        "file1.py": "# Python file 1\nprint('hello')",
        "file2.py": "# Python file 2\nprint('world')",
        "src/module.py": "# Module\ndef func(): pass",
        "docs/readme.txt": "Documentation file",
        "data.json": '{"key": "value"}',
    }

    for name, content in files.items():
        file_path = temp_project_dir / name
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding='utf-8')

    return temp_project_dir


@pytest.fixture
def sample_workflow_yaml(temp_project_dir):
    """Create a sample workflow YAML file"""
    workflows_dir = temp_project_dir / "workflows"
    workflows_dir.mkdir()

    workflow_content = """
name: Test Workflow
description: A test workflow for unit testing
version: "1.0.0"
author: Test

variables:
  project_name: test-project

steps:
  - id: step1
    name: First Step
    agent: api
    prompt: "Analyze ${project_name}"

  - id: step2
    name: Second Step
    agent: cli
    prompt: "Implement based on analysis"
    depends_on:
      - step1
"""

    workflow_file = workflows_dir / "test-workflow.yaml"
    workflow_file.write_text(workflow_content, encoding='utf-8')

    return workflow_file


@pytest.fixture(autouse=True)
def reset_singletons():
    """Reset singleton instances before each test"""
    from core.context_manager import reset_context_manager
    reset_context_manager()
    yield
    reset_context_manager()
