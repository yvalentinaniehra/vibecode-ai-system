# 📄 FUNCTIONAL SPECIFICATION: Kimi Swarm Dispatcher
**Spec ID:** SPEC-SWARM-001
**Date:** 2026-02-01
**Author:** Gemini 3 Pro (The Brain)
**Status:** DRAFT

> **Context:** Infrastructural component to enable "Parallel Execution" using Kimi K2.5 agents, as defined in `AGENT-SYSTEM-STRATEGIC-ASSESSMENT.md`.

---

## 1. System Overview

The **Swarm Dispatcher** is a sub-system within the Vibecode Core (`vibe.py`) that handles **Massively Parallel Task Execution**.

**Problem Solved:**
Sequential execution of repetitive tasks (e.g., "Write docs for 50 files") is too slow and expensive with Claude/Gemini.
**Solution:**
Spawn a "Swarm" of lightweight Kimi K2.5 agents to process 10-50 files simultaneously.

---

## 2. Architecture & Class Design

### 2.1. `SwarmDispatcher` Class
**Location:** `core/swarm_dispatch.py`

```python
class SwarmDispatcher:
    def __init__(self, max_workers: int = 10):
        self.max_workers = max_workers
        self.results = []

    def dispatch(self, task_prompt: str, target_files: List[str]) -> Dict:
        """
        Main entry point.
        1. Validates file list.
        2. Spawns ThreadPoolExecutor.
        3. Aggregates results.
        """
        pass

    def _worker_process(self, file_path: str, task: str) -> Dict:
        """
        Single worker unit.
        1. Reads file content.
        2. Calls Kimi API (Stateless).
        3. Applies changes (or returns diff).
        """
        pass
```

### 2.2. Kimi API Integration (Low-Level)
**Location:** `agents/kimi_agent.py` or `core/llm/kimi_client.py`

- **Endpoint:** `https://api.moonshot.cn/v1/chat/completions` (Standard OpenAI Compat)
- **Model:** `moonshot-v1-8k` (Fast/Cheap) or `moonshot-v1-32k`.
- **System Prompt:** Optimized for zero-chat, direct-code-output.

---

## 3. Workflow Logic

1.  **Input:** User runs CLI command.
    ```bash
    vibecode swarm --task "Add docstrings to all functions" --target_dir "agents/"
    ```

2.  **Discovery:**
    - System finds all `.py` files in `agents/`.
    - Filters list (e.g., 5 files found).

3.  **Broadcasting (The Swarm):**
    - Thread 1 -> Kimi: "Add docstrings to `agents/api.py`..."
    - Thread 2 -> Kimi: "Add docstrings to `agents/cli.py`..."
    - ... (Running in parallel)

4.  **Aggregation:**
    - Dispatcher collects success/fail status.
    - Generates a **Swarm Report**.

---

## 4. Safety & Constraints

- **Rate Limiting:** Must implement simple backoff or semaphore (Kimi limit approx 3-5 concurrent reqs for Tier 1). **INITIAL LIMIT: 3 Workers**.
- **Error Handling:** If one worker fails, the swarm continues. Failed files are listed in the final report.
- **Atomic Writes:** Workers write directly to files (Phase 1 simplicity). Phase 2 can use logical diffs.

---

## 5. Verification Requirements

- [ ] **Unit Test:** Mock API calls ensuring `ThreadPoolExecutor` runs tasks.
- [ ] **CLI Test:** Run command on a dummy folder with 3 text files.
- [ ] **Cost Monitoring:** Log token usage per swarm run.
