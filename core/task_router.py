"""
Task Router - Intelligent agent selection
The BRAIN that decides which agent handles each task
"""
from enum import Enum
from typing import Tuple, List, Dict


class AgentType(Enum):
    """Available agent types"""
    API = "api"
    CLI = "cli"
    ANTIGRAVITY = "antigravity"
    BATCH = "batch"


class TaskRouter:
    """
    Routes tasks to appropriate agents based on keyword analysis
    """

    # Routing rules: keywords mapped to agent types
    ROUTING_RULES: Dict[AgentType, List[str]] = {
        AgentType.API: [
            "analyze", "analysis", "architecture", "design", "plan", "planning",
            "strategy", "strategic", "review", "audit", "research", "explain",
            "describe", "document", "summarize", "compare", "evaluate",
            "recommend", "suggest", "think", "consider", "assess"
        ],
        AgentType.CLI: [
            "implement", "implementation", "code", "coding", "write", "writing",
            "create", "build", "building", "debug", "debugging", "fix", "fixing",
            "refactor", "refactoring", "test", "testing", "run", "execute",
            "install", "setup", "configure", "deploy", "commit", "push"
        ],
        AgentType.ANTIGRAVITY: [
            "scaffold", "scaffolding", "generate", "template"
        ],
        AgentType.BATCH: [
            "batch", "bulk", "migrate", "migration", "mass", "multiple",
            "all files", "parallel", "pipeline", "sync", "archive", "zip",
            "deduplicate", "organize", "transform all", "rename all"
        ]
    }

    # Task type hints for better routing
    TASK_PATTERNS = {
        "what is": AgentType.API,
        "how does": AgentType.API,
        "why": AgentType.API,
        "explain": AgentType.API,
        "create a": AgentType.CLI,
        "build a": AgentType.CLI,
        "write a": AgentType.CLI,
        "fix the": AgentType.CLI,
        "implement": AgentType.CLI,
        "add a": AgentType.CLI,
        "scaffold": AgentType.ANTIGRAVITY,
        "batch": AgentType.BATCH,
        "all files": AgentType.BATCH,
        "in parallel": AgentType.BATCH,
        "bulk": AgentType.BATCH,
    }

    @classmethod
    def route(cls, task_description: str) -> Tuple[AgentType, float]:
        """
        Route a task to the appropriate agent

        Args:
            task_description: Natural language task description

        Returns:
            Tuple of (AgentType, confidence_score)
        """
        task_lower = task_description.lower()

        # First check task patterns for quick matches
        for pattern, agent_type in cls.TASK_PATTERNS.items():
            if pattern in task_lower:
                return agent_type, 0.9

        # Score each agent based on keyword matches
        scores = {agent: 0.0 for agent in AgentType}

        for agent_type, keywords in cls.ROUTING_RULES.items():
            for keyword in keywords:
                if keyword in task_lower:
                    # Exact word match gets higher score
                    if f" {keyword} " in f" {task_lower} ":
                        scores[agent_type] += 1.5
                    else:
                        scores[agent_type] += 1.0

        # Find best match
        best_agent = max(scores.items(), key=lambda x: x[1])
        total_score = sum(scores.values())

        # Calculate confidence
        if total_score > 0:
            confidence = best_agent[1] / total_score
        else:
            confidence = 0.33  # Equal probability if no matches

        # Default to API agent if ambiguous (good for analysis tasks)
        if confidence < 0.4 or total_score == 0:
            return AgentType.API, 0.5

        return best_agent[0], min(confidence, 1.0)

    @classmethod
    def get_agent_description(cls, agent_type: AgentType) -> str:
        """Get human-readable description of agent capabilities"""
        descriptions = {
            AgentType.API: "Strategic analysis, planning, research, and explanation",
            AgentType.CLI: "Code implementation, debugging, testing, and execution",
            AgentType.ANTIGRAVITY: "Project scaffolding and template generation",
            AgentType.BATCH: "Parallel batch operations, pipelines, sync, and bulk processing"
        }
        return descriptions.get(agent_type, "Unknown agent type")

    @classmethod
    def explain_routing(cls, task_description: str) -> str:
        """Explain why a task was routed to a specific agent"""
        task_lower = task_description.lower()
        agent_type, confidence = cls.route(task_description)

        matched_keywords = []
        for keyword in cls.ROUTING_RULES.get(agent_type, []):
            if keyword in task_lower:
                matched_keywords.append(keyword)

        explanation = f"Task routed to {agent_type.value} agent\n"
        explanation += f"Confidence: {confidence:.0%}\n"
        explanation += f"Matched keywords: {', '.join(matched_keywords) or 'none (default)'}\n"
        explanation += f"Agent purpose: {cls.get_agent_description(agent_type)}"

        return explanation
