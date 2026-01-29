"""
Cost Tracker - Track and report API usage costs
Provides real-time cost monitoring and budget alerts
"""
import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import threading

# Fix Windows encoding
import sys
if sys.platform == 'win32':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console(force_terminal=True)


@dataclass
class UsageRecord:
    """Single API usage record"""
    timestamp: str
    model: str
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int
    cache_write_tokens: int
    cost: float
    task_type: str
    agent: str


class CostTracker:
    """Tracks API usage and costs across sessions"""

    # Pricing per 1M tokens (Claude Sonnet 3.5)
    PRICING = {
        "input": 3.00,
        "output": 15.00,
        "cache_read": 0.30,
        "cache_write": 3.75
    }

    # Budget alerts (in USD)
    DEFAULT_DAILY_BUDGET = 10.00
    DEFAULT_MONTHLY_BUDGET = 100.00

    def __init__(self, project_path: str = None):
        self.project_path = Path(project_path or os.getcwd())
        self.data_dir = self.project_path / ".vibecode" / "costs"
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.current_file = self.data_dir / f"usage_{datetime.now().strftime('%Y%m')}.json"
        self.records: List[UsageRecord] = []
        self.session_cost = 0.0
        self.session_start = datetime.now()

        self._lock = threading.Lock()
        self._load_records()

    def _load_records(self):
        """Load existing records from file"""
        if self.current_file.exists():
            try:
                with open(self.current_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.records = [UsageRecord(**r) for r in data.get('records', [])]
            except Exception:
                self.records = []

    def _save_records(self):
        """Save records to file"""
        with self._lock:
            data = {
                "updated_at": datetime.now().isoformat(),
                "records": [asdict(r) for r in self.records]
            }
            with open(self.current_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)

    def record_usage(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        cache_read_tokens: int = 0,
        cache_write_tokens: int = 0,
        task_type: str = "task",
        agent: str = "api"
    ) -> float:
        """Record API usage and return cost"""
        cost = self.calculate_cost(
            input_tokens, output_tokens,
            cache_read_tokens, cache_write_tokens
        )

        record = UsageRecord(
            timestamp=datetime.now().isoformat(),
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cache_read_tokens=cache_read_tokens,
            cache_write_tokens=cache_write_tokens,
            cost=cost,
            task_type=task_type,
            agent=agent
        )

        self.records.append(record)
        self.session_cost += cost
        self._save_records()

        # Check budget alerts
        self._check_budget_alerts()

        return cost

    def calculate_cost(
        self,
        input_tokens: int,
        output_tokens: int,
        cache_read_tokens: int = 0,
        cache_write_tokens: int = 0
    ) -> float:
        """Calculate cost for given token usage"""
        input_cost = input_tokens / 1_000_000 * self.PRICING["input"]
        output_cost = output_tokens / 1_000_000 * self.PRICING["output"]
        cache_read_cost = cache_read_tokens / 1_000_000 * self.PRICING["cache_read"]
        cache_write_cost = cache_write_tokens / 1_000_000 * self.PRICING["cache_write"]

        return input_cost + output_cost + cache_read_cost + cache_write_cost

    def _check_budget_alerts(self):
        """Check if budget thresholds are exceeded"""
        daily = self.get_daily_cost()
        monthly = self.get_monthly_cost()

        if daily > self.DEFAULT_DAILY_BUDGET:
            console.print(f"[yellow]⚠️ Daily budget exceeded: ${daily:.2f} / ${self.DEFAULT_DAILY_BUDGET:.2f}[/yellow]")

        if monthly > self.DEFAULT_MONTHLY_BUDGET:
            console.print(f"[red]🚨 Monthly budget exceeded: ${monthly:.2f} / ${self.DEFAULT_MONTHLY_BUDGET:.2f}[/red]")

    def get_session_cost(self) -> float:
        """Get current session cost"""
        return self.session_cost

    def get_daily_cost(self, date: datetime = None) -> float:
        """Get cost for a specific day"""
        target_date = (date or datetime.now()).date()
        daily_cost = 0.0

        for record in self.records:
            record_date = datetime.fromisoformat(record.timestamp).date()
            if record_date == target_date:
                daily_cost += record.cost

        return daily_cost

    def get_monthly_cost(self, year: int = None, month: int = None) -> float:
        """Get cost for a specific month"""
        now = datetime.now()
        target_year = year or now.year
        target_month = month or now.month

        monthly_cost = 0.0

        for record in self.records:
            record_dt = datetime.fromisoformat(record.timestamp)
            if record_dt.year == target_year and record_dt.month == target_month:
                monthly_cost += record.cost

        return monthly_cost

    def get_total_tokens(self) -> Dict[str, int]:
        """Get total token usage"""
        totals = {
            "input": 0,
            "output": 0,
            "cache_read": 0,
            "cache_write": 0
        }

        for record in self.records:
            totals["input"] += record.input_tokens
            totals["output"] += record.output_tokens
            totals["cache_read"] += record.cache_read_tokens
            totals["cache_write"] += record.cache_write_tokens

        return totals

    def get_usage_by_agent(self) -> Dict[str, float]:
        """Get cost breakdown by agent"""
        by_agent = {}

        for record in self.records:
            agent = record.agent
            if agent not in by_agent:
                by_agent[agent] = 0.0
            by_agent[agent] += record.cost

        return by_agent

    def get_usage_by_task_type(self) -> Dict[str, float]:
        """Get cost breakdown by task type"""
        by_type = {}

        for record in self.records:
            task_type = record.task_type
            if task_type not in by_type:
                by_type[task_type] = 0.0
            by_type[task_type] += record.cost

        return by_type

    def display_report(self, period: str = "session"):
        """Display cost report"""
        if period == "session":
            self._display_session_report()
        elif period == "daily":
            self._display_daily_report()
        elif period == "monthly":
            self._display_monthly_report()
        else:
            self._display_full_report()

    def _display_session_report(self):
        """Display current session report"""
        duration = (datetime.now() - self.session_start).total_seconds()

        table = Table(title="Session Cost Report")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")

        table.add_row("Session Duration", f"{duration:.0f}s")
        table.add_row("Session Cost", f"${self.session_cost:.4f}")
        table.add_row("API Calls", str(len([r for r in self.records if datetime.fromisoformat(r.timestamp) >= self.session_start])))

        console.print(table)

    def _display_daily_report(self):
        """Display daily report"""
        daily_cost = self.get_daily_cost()

        table = Table(title=f"Daily Cost Report - {datetime.now().strftime('%Y-%m-%d')}")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")

        table.add_row("Today's Cost", f"${daily_cost:.4f}")
        table.add_row("Daily Budget", f"${self.DEFAULT_DAILY_BUDGET:.2f}")
        table.add_row("Remaining", f"${max(0, self.DEFAULT_DAILY_BUDGET - daily_cost):.2f}")

        by_agent = self.get_usage_by_agent()
        for agent, cost in by_agent.items():
            table.add_row(f"  {agent.upper()} Agent", f"${cost:.4f}")

        console.print(table)

    def _display_monthly_report(self):
        """Display monthly report"""
        monthly_cost = self.get_monthly_cost()
        tokens = self.get_total_tokens()

        table = Table(title=f"Monthly Cost Report - {datetime.now().strftime('%Y-%m')}")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")

        table.add_row("Monthly Cost", f"${monthly_cost:.4f}")
        table.add_row("Monthly Budget", f"${self.DEFAULT_MONTHLY_BUDGET:.2f}")
        table.add_row("Remaining", f"${max(0, self.DEFAULT_MONTHLY_BUDGET - monthly_cost):.2f}")
        table.add_row("", "")
        table.add_row("Input Tokens", f"{tokens['input']:,}")
        table.add_row("Output Tokens", f"{tokens['output']:,}")
        table.add_row("Cache Read", f"{tokens['cache_read']:,}")
        table.add_row("Cache Write", f"{tokens['cache_write']:,}")

        console.print(table)

    def _display_full_report(self):
        """Display comprehensive report"""
        self._display_session_report()
        console.print("")
        self._display_daily_report()
        console.print("")
        self._display_monthly_report()

    def export_csv(self, filepath: str = None) -> str:
        """Export usage data to CSV"""
        import csv

        filepath = filepath or str(self.data_dir / f"export_{datetime.now().strftime('%Y%m%d')}.csv")

        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'timestamp', 'model', 'input_tokens', 'output_tokens',
                'cache_read', 'cache_write', 'cost', 'task_type', 'agent'
            ])

            for record in self.records:
                writer.writerow([
                    record.timestamp, record.model, record.input_tokens,
                    record.output_tokens, record.cache_read_tokens,
                    record.cache_write_tokens, record.cost,
                    record.task_type, record.agent
                ])

        console.print(f"[green]Exported to {filepath}[/green]")
        return filepath


# Singleton instance
_cost_tracker: Optional[CostTracker] = None


def get_cost_tracker(project_path: str = None) -> CostTracker:
    """Get singleton CostTracker instance"""
    global _cost_tracker
    if _cost_tracker is None:
        _cost_tracker = CostTracker(project_path)
    return _cost_tracker
