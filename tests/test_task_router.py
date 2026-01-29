"""
Unit tests for Task Router
"""
import pytest
from core.task_router import TaskRouter, AgentType


class TestAgentType:
    """Test AgentType enum"""

    def test_agent_types_exist(self):
        """Verify all agent types are defined"""
        assert AgentType.API.value == "api"
        assert AgentType.CLI.value == "cli"
        assert AgentType.ANTIGRAVITY.value == "antigravity"
        assert AgentType.BATCH.value == "batch"

    def test_agent_type_from_string(self):
        """Test creating AgentType from string"""
        assert AgentType("api") == AgentType.API
        assert AgentType("cli") == AgentType.CLI
        assert AgentType("batch") == AgentType.BATCH


class TestTaskRouter:
    """Test TaskRouter routing logic"""

    def test_route_analysis_task_to_api(self):
        """Tasks with 'analyze' should route to API agent"""
        agent, confidence = TaskRouter.route("Analyze the code architecture")
        assert agent == AgentType.API
        assert confidence >= 0.5

    def test_route_explain_task_to_api(self):
        """Tasks with 'explain' should route to API agent"""
        agent, confidence = TaskRouter.route("Explain how this function works")
        assert agent == AgentType.API
        assert confidence >= 0.5

    def test_route_implement_task_to_cli(self):
        """Tasks with 'implement' should route to CLI agent"""
        agent, confidence = TaskRouter.route("Implement a login form")
        assert agent == AgentType.CLI
        assert confidence >= 0.5

    def test_route_create_task_to_cli(self):
        """Tasks starting with 'create a' should route to CLI agent"""
        agent, confidence = TaskRouter.route("Create a new component")
        assert agent == AgentType.CLI
        assert confidence >= 0.5

    def test_route_fix_task_to_cli(self):
        """Tasks with 'fix' should route to CLI agent"""
        agent, confidence = TaskRouter.route("Fix the bug in login")
        assert agent == AgentType.CLI
        assert confidence >= 0.5

    def test_route_batch_task_to_batch(self):
        """Tasks with 'batch' should route to Batch agent"""
        agent, confidence = TaskRouter.route("Batch rename all files")
        assert agent == AgentType.BATCH
        assert confidence >= 0.5

    def test_route_bulk_task_to_batch(self):
        """Tasks with 'bulk' should route to Batch agent"""
        agent, confidence = TaskRouter.route("Bulk update all modules")
        assert agent == AgentType.BATCH
        assert confidence >= 0.5

    def test_route_scaffold_task_to_antigravity(self):
        """Tasks with 'scaffold' should route to Antigravity agent"""
        agent, confidence = TaskRouter.route("Scaffold a new project")
        assert agent == AgentType.ANTIGRAVITY
        assert confidence >= 0.5

    def test_route_ambiguous_task_defaults_to_api(self):
        """Ambiguous tasks should default to API agent"""
        agent, confidence = TaskRouter.route("Do something with the project")
        assert agent == AgentType.API
        # Lower confidence for ambiguous tasks
        assert confidence <= 0.6

    def test_route_empty_task(self):
        """Empty task should default to API with low confidence"""
        agent, confidence = TaskRouter.route("")
        assert agent == AgentType.API
        assert confidence == 0.5

    def test_case_insensitive_routing(self):
        """Routing should be case insensitive"""
        agent1, _ = TaskRouter.route("ANALYZE the code")
        agent2, _ = TaskRouter.route("analyze the code")
        assert agent1 == agent2 == AgentType.API

    def test_get_agent_description(self):
        """Test agent description retrieval"""
        desc = TaskRouter.get_agent_description(AgentType.API)
        assert "analysis" in desc.lower() or "planning" in desc.lower()

        desc = TaskRouter.get_agent_description(AgentType.CLI)
        assert "implementation" in desc.lower() or "execution" in desc.lower()

        desc = TaskRouter.get_agent_description(AgentType.BATCH)
        assert "batch" in desc.lower() or "parallel" in desc.lower()

    def test_explain_routing(self):
        """Test routing explanation"""
        explanation = TaskRouter.explain_routing("Analyze the code")
        assert "api" in explanation.lower()
        assert "confidence" in explanation.lower()

    def test_multiple_keywords_increase_confidence(self):
        """Multiple matching keywords should increase confidence"""
        # Single keyword
        _, conf1 = TaskRouter.route("analyze")
        # Multiple keywords
        _, conf2 = TaskRouter.route("analyze and review the architecture")
        # More keywords should give higher or equal confidence
        assert conf2 >= conf1


class TestRoutingPatterns:
    """Test specific routing patterns"""

    def test_what_is_pattern(self):
        """'What is' pattern should route to API"""
        agent, _ = TaskRouter.route("What is the purpose of this class?")
        assert agent == AgentType.API

    def test_how_does_pattern(self):
        """'How does' pattern should route to API"""
        agent, _ = TaskRouter.route("How does authentication work?")
        assert agent == AgentType.API

    def test_build_a_pattern(self):
        """'Build a' pattern should route to CLI"""
        agent, _ = TaskRouter.route("Build a REST API endpoint")
        assert agent == AgentType.CLI

    def test_write_a_pattern(self):
        """'Write a' pattern should route to CLI"""
        agent, _ = TaskRouter.route("Write a unit test for login")
        assert agent == AgentType.CLI

    def test_all_files_pattern(self):
        """'All files' pattern should route to Batch"""
        agent, _ = TaskRouter.route("Update all files in the project")
        assert agent == AgentType.BATCH

    def test_in_parallel_pattern(self):
        """'In parallel' pattern should route to Batch"""
        agent, _ = TaskRouter.route("Process files in parallel")
        assert agent == AgentType.BATCH
