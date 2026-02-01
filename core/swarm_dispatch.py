"""
SwarmDispatcher - Massively Parallel Task Execution Engine.
Part of Vibecode Core Infrastructure.

Enables "Swarm Intelligence" by spawning multiple lightweight Kimi agents
to process file lists simultaneously.
"""

import os
import concurrent.futures
from typing import List, Dict, Any
from pathlib import Path
from rich.console import Console
from rich.progress import Progress

# Using OpenAI SDK for Moonshot/Kimi compatibility
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

console = Console()

class SwarmDispatcher:
    def __init__(self, max_workers: int = 3):
        """
        Initialize the Swarm Dispatcher.
        
        Args:
            max_workers: Number of concurrent threads. 
                         Kept low (3) initially to respect rate limits.
        """
        self.max_workers = max_workers
        # Kimi / Moonshot setup
        api_key = os.getenv("MOONSHOT_API_KEY") 
        base_url = os.getenv("MOONSHOT_BASE_URL", "https://api.moonshot.cn/v1")

        if not api_key:
             console.print("[yellow]Warning: MOONSHOT_API_KEY not found in env. Swarm may fail.[/yellow]")
        
        self.client = OpenAI(
            api_key=api_key or "dummy", 
            base_url=base_url,
        )
        self.results = []


    def dispatch(self, task_prompt: str, target_files: List[str]) -> Dict[str, Any]:
        """
        Main entry point to dispatch tasks to the swarm.
        """
        console.print(f"[bold green]🚀 Launching Swarm on {len(target_files)} files with {self.max_workers} workers...[/bold green]")
        
        results = {}
        with Progress() as progress:
            task_id = progress.add_task("[cyan]Swarm Working...", total=len(target_files))
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                # Map files to worker processes
                future_to_file = {
                    executor.submit(self._worker_process, f, task_prompt): f 
                    for f in target_files
                }
                
                for future in concurrent.futures.as_completed(future_to_file):
                    file_path = future_to_file[future]
                    try:
                        res = future.result()
                        results[file_path] = {"status": "success", "detail": res}
                    except Exception as exc:
                        results[file_path] = {"status": "error", "error": str(exc)}
                    
                    progress.update(task_id, advance=1)
        
        self._print_summary(results)
        return results

    def _worker_process(self, file_path: str, task: str) -> str:
        """
        Single worker unit.
        1. Reads file.
        2. Sends to Kimi.
        3. Writes back (simulated for now if read-only provided).
        """
        # 1. Read File
        path_obj = Path(file_path)
        if not path_obj.exists():
            raise FileNotFoundError(f"{file_path} does not exist")
            
        content = path_obj.read_text(encoding='utf-8')
        
        # 2. Call Kimi
        # Construct a strict system prompt for code editing
        system_prompt = (
            "You are an expert code refactoring agent. "
            "You will receive a file's content and a task. "
            "Output ONLY the modified code. No markdown fences if possible, or strict fences. "
            "If no changes needed, output the original code strictly."
        )
        
        model_id = os.getenv("MOONSHOT_MODEL", "moonshotai/kimi-k2.5")
        try:
            response = self.client.chat.completions.create(
                model=model_id,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"TASK: {task}\n\nFILE CONTENT:\n{content}"}
                ],
                temperature=0.3,
                max_tokens=4096,
                extra_headers={
                    "HTTP-Referer": "https://vibecode.ai",
                    "X-Title": "Vibecode Swarm"
                }
            )

            new_content = response.choices[0].message.content
        except Exception as e:
            return f"API Error: {str(e)}"


        
        # Clean markdown fences if Kimi adds them
        if new_content.startswith("```"):
            lines = new_content.splitlines()
            # Remove first and last line if they are fences
            if lines[0].startswith("```"): lines = lines[1:]
            if lines and lines[-1].startswith("```"): lines = lines[:-1]
            new_content = "\n".join(lines)
            
        # 3. Write Back (Atomic-ish)
        path_obj.write_text(new_content, encoding='utf-8')
        
        return "Modified"

    def _print_summary(self, results: Dict):
        console.print("\n[bold]Swarm Mission Report:[/bold]")
        for f, res in results.items():
            if res['status'] == 'success':
                console.print(f"✅ {f}: {res['detail']}")
            else:
                console.print(f"❌ {f}: {res['error']}")
