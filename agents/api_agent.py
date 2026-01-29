"""
Claude API Agent - Strategic analysis & planning
Handles: analyze, architecture, design, plan, strategy, review, audit, research, explain
"""
import sys
import os
from typing import Dict, Any, Optional
from anthropic import Anthropic
from rich.console import Console

# Fix Windows encoding
if sys.platform == 'win32':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

console = Console(force_terminal=True)


class APIAgent:
    """Claude API wrapper with prompt caching and cost tracking"""

    def __init__(self, model: str = None, api_key: str = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")

        self.client = Anthropic(api_key=self.api_key)
        self.model = model or os.getenv("DEFAULT_MODEL", "claude-sonnet-4-5-20250929")
        self.total_cost = 0.0
        self.total_requests = 0

    def execute(
        self,
        task: str,
        system_context: str = "",
        use_cache: bool = True,
        max_tokens: int = 4096
    ) -> Dict[str, Any]:
        """
        Execute a task using Claude API

        Args:
            task: The task/prompt to execute
            system_context: Optional system context (will be cached if use_cache=True)
            use_cache: Whether to use prompt caching for system context
            max_tokens: Maximum tokens in response

        Returns:
            Dict with success, result, usage, cost
        """
        console.print(f"[cyan]🤖 API Agent executing...[/cyan]")

        messages = [{"role": "user", "content": task}]

        try:
            # Build request parameters
            kwargs = {
                "model": self.model,
                "max_tokens": max_tokens,
                "messages": messages
            }

            # Add system context with optional caching
            if system_context:
                if use_cache:
                    kwargs["system"] = [{
                        "type": "text",
                        "text": system_context,
                        "cache_control": {"type": "ephemeral"}
                    }]
                else:
                    kwargs["system"] = system_context

            # Make API call
            response = self.client.messages.create(**kwargs)

            # Extract result
            result = response.content[0].text
            cost = self._calculate_cost(response.usage)
            self.total_cost += cost
            self.total_requests += 1

            console.print(f"[dim]💰 Cost: ${cost:.4f} | Total: ${self.total_cost:.4f}[/dim]")

            return {
                "success": True,
                "result": result,
                "usage": {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                    "cache_read": getattr(response.usage, 'cache_read_input_tokens', 0),
                    "cache_write": getattr(response.usage, 'cache_creation_input_tokens', 0)
                },
                "cost": cost,
                "model": self.model
            }

        except Exception as e:
            console.print(f"[red]❌ API Error: {str(e)}[/red]")
            return {
                "success": False,
                "error": str(e),
                "result": None
            }

    def _calculate_cost(self, usage) -> float:
        """
        Calculate cost based on Claude Sonnet pricing
        - Input: $3.00 / 1M tokens
        - Output: $15.00 / 1M tokens
        - Cache read: $0.30 / 1M tokens
        - Cache write: $3.75 / 1M tokens
        """
        input_cost = usage.input_tokens / 1_000_000 * 3.0
        output_cost = usage.output_tokens / 1_000_000 * 15.0

        # Cache costs (if available)
        cache_read = getattr(usage, 'cache_read_input_tokens', 0)
        cache_write = getattr(usage, 'cache_creation_input_tokens', 0)

        cache_read_cost = cache_read / 1_000_000 * 0.30
        cache_write_cost = cache_write / 1_000_000 * 3.75

        return input_cost + output_cost + cache_read_cost + cache_write_cost

    def get_total_cost(self) -> float:
        """Get total cost across all requests in this session"""
        return self.total_cost

    def get_stats(self) -> Dict[str, Any]:
        """Get usage statistics"""
        return {
            "total_requests": self.total_requests,
            "total_cost": self.total_cost,
            "model": self.model
        }

    def chat(
        self,
        messages: list,
        system_context: str = "",
        max_tokens: int = 4096
    ) -> Dict[str, Any]:
        """
        Multi-turn conversation support

        Args:
            messages: List of message dicts with 'role' and 'content'
            system_context: Optional system context
            max_tokens: Maximum tokens in response
        """
        console.print(f"[cyan]🤖 API Agent (chat mode)...[/cyan]")

        try:
            kwargs = {
                "model": self.model,
                "max_tokens": max_tokens,
                "messages": messages
            }

            if system_context:
                kwargs["system"] = system_context

            response = self.client.messages.create(**kwargs)

            result = response.content[0].text
            cost = self._calculate_cost(response.usage)
            self.total_cost += cost
            self.total_requests += 1

            return {
                "success": True,
                "result": result,
                "cost": cost
            }

        except Exception as e:
            console.print(f"[red]❌ Chat Error: {str(e)}[/red]")
            return {"success": False, "error": str(e)}
