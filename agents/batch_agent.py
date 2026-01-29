"""
Batch Agent - Advanced parallel batch operations
Handles: batch processing, parallel execution, pipelines, queue management
"""
import sys
import os
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime
import shutil
import json
import re

# Fix Windows encoding
if sys.platform == 'win32':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table

console = Console(force_terminal=True)


@dataclass
class BatchTask:
    """Represents a single task in a batch operation"""
    id: str
    operation: str
    source: Path
    destination: Optional[Path] = None
    options: Dict[str, Any] = field(default_factory=dict)
    status: str = "pending"  # pending, running, completed, failed
    result: Optional[Dict] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@dataclass
class BatchResult:
    """Result of a batch operation"""
    success: bool
    operation: str
    total: int
    completed: int
    failed: int
    skipped: int
    tasks: List[BatchTask]
    duration: float
    rollback_available: bool = False


class BatchAgent:
    """
    Advanced batch operations agent with parallel execution,
    pipeline support, and rollback capabilities
    """

    def __init__(self, project_path: str = None, max_workers: int = 4):
        self.project_path = Path(project_path or os.getcwd())
        self.max_workers = max_workers
        self.operations_count = 0
        self.history: List[BatchResult] = []
        self._rollback_stack: List[Dict] = []

    def execute(
        self,
        operation: str,
        targets: List[str] = None,
        options: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Execute a batch operation

        Args:
            operation: Type of operation
            targets: List of file patterns or paths
            options: Operation-specific options

        Returns:
            Dict with operation results
        """
        console.print(f"[yellow]⚡ Batch Agent executing: {operation}[/yellow]")

        options = options or {}
        targets = targets or []
        start_time = datetime.now()

        try:
            if operation == 'parallel_transform':
                result = self._parallel_transform(targets, options)
            elif operation == 'pipeline':
                result = self._execute_pipeline(options.get('steps', []))
            elif operation == 'bulk_rename':
                result = self._bulk_rename(targets, options)
            elif operation == 'sync':
                result = self._sync_directories(options)
            elif operation == 'archive':
                result = self._archive_files(targets, options)
            elif operation == 'extract':
                result = self._extract_archive(options)
            elif operation == 'deduplicate':
                result = self._deduplicate_files(targets, options)
            elif operation == 'organize':
                result = self._organize_by_type(targets, options)
            elif operation == 'rollback':
                result = self._rollback_last()
            elif operation == 'status':
                result = self._get_status()
            else:
                result = {"success": False, "error": f"Unknown operation: {operation}"}

            # Calculate duration
            duration = (datetime.now() - start_time).total_seconds()
            if isinstance(result, dict):
                result['duration'] = duration

            return result

        except Exception as e:
            console.print(f"[red]❌ Batch Error: {str(e)}[/red]")
            return {"success": False, "error": str(e)}

    def _parallel_transform(
        self,
        patterns: List[str],
        options: Dict
    ) -> Dict[str, Any]:
        """
        Transform files in parallel using multiple workers
        """
        find = options.get('find', '')
        replace = options.get('replace', '')
        regex = options.get('regex', False)
        dry_run = options.get('dry_run', False)
        encoding = options.get('encoding', 'utf-8')

        if not find:
            return {"success": False, "error": "Find pattern required"}

        # Collect all files
        files = []
        for pattern in patterns:
            files.extend([f for f in self.project_path.glob(pattern) if f.is_file()])

        if not files:
            return {"success": True, "message": "No files matched", "count": 0}

        results = []
        errors = []
        rollback_data = []

        def process_file(file_path: Path) -> Dict:
            try:
                content = file_path.read_text(encoding=encoding)

                if regex:
                    matches = len(re.findall(find, content))
                    if matches > 0:
                        new_content = re.sub(find, replace, content)
                else:
                    matches = content.count(find)
                    if matches > 0:
                        new_content = content.replace(find, replace)

                if matches > 0:
                    if not dry_run:
                        # Store for rollback
                        rollback_data.append({
                            "file": str(file_path),
                            "original": content
                        })
                        file_path.write_text(new_content, encoding=encoding)

                    return {
                        "file": str(file_path),
                        "matches": matches,
                        "status": "transformed" if not dry_run else "would_transform"
                    }
                return {"file": str(file_path), "matches": 0, "status": "skipped"}

            except Exception as e:
                return {"file": str(file_path), "error": str(e), "status": "error"}

        # Execute in parallel with progress bar
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=console
        ) as progress:
            task = progress.add_task("Transforming files...", total=len(files))

            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = {executor.submit(process_file, f): f for f in files}

                for future in as_completed(futures):
                    result = future.result()
                    if result.get("status") == "error":
                        errors.append(result)
                    else:
                        results.append(result)
                    progress.advance(task)

        # Save rollback data
        if rollback_data and not dry_run:
            self._rollback_stack.append({
                "operation": "parallel_transform",
                "data": rollback_data,
                "timestamp": datetime.now().isoformat()
            })

        transformed = [r for r in results if r.get("status") in ("transformed", "would_transform")]
        self.operations_count += len(transformed)

        return {
            "success": len(errors) == 0,
            "operation": "parallel_transform",
            "total_files": len(files),
            "transformed": len(transformed),
            "skipped": len(results) - len(transformed),
            "errors": len(errors),
            "error_details": errors if errors else None,
            "dry_run": dry_run,
            "rollback_available": len(rollback_data) > 0
        }

    def _execute_pipeline(self, steps: List[Dict]) -> Dict[str, Any]:
        """
        Execute a pipeline of operations sequentially
        """
        if not steps:
            return {"success": False, "error": "No pipeline steps provided"}

        results = []
        console.print(f"[cyan]📋 Executing pipeline with {len(steps)} steps[/cyan]")

        for i, step in enumerate(steps, 1):
            step_name = step.get('name', f'Step {i}')
            operation = step.get('operation')
            targets = step.get('targets', [])
            options = step.get('options', {})

            console.print(f"[dim]  Step {i}/{len(steps)}: {step_name}[/dim]")

            # Execute step
            result = self.execute(operation, targets, options)
            results.append({
                "step": i,
                "name": step_name,
                "operation": operation,
                "result": result
            })

            # Stop pipeline on failure unless continue_on_error is set
            if not result.get('success') and not step.get('continue_on_error', False):
                console.print(f"[red]Pipeline failed at step {i}[/red]")
                return {
                    "success": False,
                    "operation": "pipeline",
                    "failed_step": i,
                    "results": results
                }

        return {
            "success": True,
            "operation": "pipeline",
            "steps_completed": len(steps),
            "results": results
        }

    def _bulk_rename(self, patterns: List[str], options: Dict) -> Dict[str, Any]:
        """
        Bulk rename files with advanced patterns
        """
        template = options.get('template', '{name}{ext}')
        dry_run = options.get('dry_run', False)
        counter_start = options.get('counter_start', 1)
        date_format = options.get('date_format', '%Y%m%d')

        files = []
        for pattern in patterns:
            files.extend([f for f in self.project_path.glob(pattern) if f.is_file()])

        if not files:
            return {"success": True, "message": "No files matched", "count": 0}

        renamed = []
        errors = []
        rollback_data = []
        counter = counter_start

        for file in sorted(files):
            try:
                # Build new name from template
                now = datetime.now()
                new_name = template.format(
                    name=file.stem,
                    ext=file.suffix,
                    counter=counter,
                    counter_pad=str(counter).zfill(4),
                    date=now.strftime(date_format),
                    timestamp=int(now.timestamp()),
                    parent=file.parent.name
                )

                # Ensure extension
                if not Path(new_name).suffix and file.suffix:
                    new_name += file.suffix

                new_path = file.parent / new_name

                if dry_run:
                    renamed.append({
                        "from": str(file),
                        "to": str(new_path),
                        "dry_run": True
                    })
                else:
                    if new_path.exists():
                        errors.append({
                            "file": str(file),
                            "error": f"Target exists: {new_path}"
                        })
                        continue

                    rollback_data.append({
                        "from": str(new_path),
                        "to": str(file)
                    })
                    file.rename(new_path)
                    renamed.append({"from": str(file), "to": str(new_path)})

                counter += 1

            except Exception as e:
                errors.append({"file": str(file), "error": str(e)})

        # Save rollback data
        if rollback_data and not dry_run:
            self._rollback_stack.append({
                "operation": "bulk_rename",
                "data": rollback_data,
                "timestamp": datetime.now().isoformat()
            })

        self.operations_count += len(renamed)

        return {
            "success": len(errors) == 0,
            "operation": "bulk_rename",
            "renamed": renamed,
            "count": len(renamed),
            "errors": errors if errors else None,
            "rollback_available": len(rollback_data) > 0
        }

    def _sync_directories(self, options: Dict) -> Dict[str, Any]:
        """
        Synchronize two directories
        """
        source = options.get('source', '')
        destination = options.get('destination', '')
        delete_extra = options.get('delete_extra', False)
        dry_run = options.get('dry_run', False)

        if not source or not destination:
            return {"success": False, "error": "Source and destination required"}

        src_path = Path(source) if Path(source).is_absolute() else self.project_path / source
        dst_path = Path(destination) if Path(destination).is_absolute() else self.project_path / destination

        if not src_path.exists():
            return {"success": False, "error": f"Source not found: {src_path}"}

        copied = []
        updated = []
        deleted = []
        errors = []

        # Get all source files
        src_files = {f.relative_to(src_path): f for f in src_path.rglob('*') if f.is_file()}

        # Sync files
        for rel_path, src_file in src_files.items():
            dst_file = dst_path / rel_path

            try:
                if not dst_file.exists():
                    if not dry_run:
                        dst_file.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(src_file, dst_file)
                    copied.append(str(rel_path))
                elif src_file.stat().st_mtime > dst_file.stat().st_mtime:
                    if not dry_run:
                        shutil.copy2(src_file, dst_file)
                    updated.append(str(rel_path))
            except Exception as e:
                errors.append({"file": str(rel_path), "error": str(e)})

        # Delete extra files in destination
        if delete_extra and dst_path.exists():
            dst_files = {f.relative_to(dst_path): f for f in dst_path.rglob('*') if f.is_file()}
            for rel_path, dst_file in dst_files.items():
                if rel_path not in src_files:
                    try:
                        if not dry_run:
                            dst_file.unlink()
                        deleted.append(str(rel_path))
                    except Exception as e:
                        errors.append({"file": str(rel_path), "error": str(e)})

        return {
            "success": len(errors) == 0,
            "operation": "sync",
            "copied": len(copied),
            "updated": len(updated),
            "deleted": len(deleted),
            "errors": errors if errors else None,
            "dry_run": dry_run
        }

    def _archive_files(self, patterns: List[str], options: Dict) -> Dict[str, Any]:
        """
        Archive files to zip/tar
        """
        output = options.get('output', 'archive.zip')
        format_type = options.get('format', 'zip')
        dry_run = options.get('dry_run', False)

        files = []
        for pattern in patterns:
            files.extend([f for f in self.project_path.glob(pattern) if f.is_file()])

        if not files:
            return {"success": True, "message": "No files to archive", "count": 0}

        output_path = self.project_path / output

        if dry_run:
            return {
                "success": True,
                "operation": "archive",
                "output": str(output_path),
                "files_count": len(files),
                "dry_run": True
            }

        try:
            if format_type == 'zip':
                import zipfile
                with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                    for file in files:
                        zf.write(file, file.relative_to(self.project_path))
            else:
                import tarfile
                mode = 'w:gz' if format_type == 'tar.gz' else 'w'
                with tarfile.open(output_path, mode) as tf:
                    for file in files:
                        tf.add(file, file.relative_to(self.project_path))

            return {
                "success": True,
                "operation": "archive",
                "output": str(output_path),
                "format": format_type,
                "files_count": len(files),
                "size": output_path.stat().st_size
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    def _extract_archive(self, options: Dict) -> Dict[str, Any]:
        """
        Extract archive to directory
        """
        archive = options.get('archive', '')
        destination = options.get('destination', '.')
        dry_run = options.get('dry_run', False)

        if not archive:
            return {"success": False, "error": "Archive path required"}

        archive_path = Path(archive) if Path(archive).is_absolute() else self.project_path / archive
        dest_path = Path(destination) if Path(destination).is_absolute() else self.project_path / destination

        if not archive_path.exists():
            return {"success": False, "error": f"Archive not found: {archive_path}"}

        if dry_run:
            return {
                "success": True,
                "operation": "extract",
                "archive": str(archive_path),
                "destination": str(dest_path),
                "dry_run": True
            }

        try:
            if archive_path.suffix == '.zip':
                import zipfile
                with zipfile.ZipFile(archive_path, 'r') as zf:
                    zf.extractall(dest_path)
                    files_count = len(zf.namelist())
            else:
                import tarfile
                with tarfile.open(archive_path, 'r:*') as tf:
                    tf.extractall(dest_path)
                    files_count = len(tf.getnames())

            return {
                "success": True,
                "operation": "extract",
                "archive": str(archive_path),
                "destination": str(dest_path),
                "files_count": files_count
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    def _deduplicate_files(self, patterns: List[str], options: Dict) -> Dict[str, Any]:
        """
        Find and optionally remove duplicate files
        """
        import hashlib

        dry_run = options.get('dry_run', True)
        keep = options.get('keep', 'first')  # first, newest, oldest

        files = []
        for pattern in patterns:
            files.extend([f for f in self.project_path.glob(pattern) if f.is_file()])

        # Calculate hashes
        hash_map: Dict[str, List[Path]] = {}
        for file in files:
            try:
                file_hash = hashlib.md5(file.read_bytes()).hexdigest()
                if file_hash not in hash_map:
                    hash_map[file_hash] = []
                hash_map[file_hash].append(file)
            except Exception:
                pass

        # Find duplicates
        duplicates = []
        to_delete = []

        for file_hash, file_list in hash_map.items():
            if len(file_list) > 1:
                # Sort by modification time
                sorted_files = sorted(file_list, key=lambda f: f.stat().st_mtime)

                if keep == 'newest':
                    keep_file = sorted_files[-1]
                elif keep == 'oldest':
                    keep_file = sorted_files[0]
                else:  # first (by name)
                    keep_file = sorted(file_list, key=lambda f: str(f))[0]

                for f in file_list:
                    if f != keep_file:
                        to_delete.append(f)
                        duplicates.append({
                            "file": str(f),
                            "duplicate_of": str(keep_file),
                            "size": f.stat().st_size
                        })

        # Delete duplicates if not dry run
        deleted = []
        if not dry_run:
            for f in to_delete:
                try:
                    f.unlink()
                    deleted.append(str(f))
                except Exception:
                    pass

        return {
            "success": True,
            "operation": "deduplicate",
            "duplicates_found": len(duplicates),
            "deleted": len(deleted) if not dry_run else 0,
            "space_saved": sum(d['size'] for d in duplicates),
            "duplicates": duplicates[:20],  # Limit output
            "dry_run": dry_run
        }

    def _organize_by_type(self, patterns: List[str], options: Dict) -> Dict[str, Any]:
        """
        Organize files into folders by type/extension
        """
        dry_run = options.get('dry_run', False)
        destination = options.get('destination', 'organized')

        type_folders = {
            'images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'],
            'documents': ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
            'code': ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.rs'],
            'data': ['.json', '.xml', '.yaml', '.yml', '.csv', '.sql'],
            'archives': ['.zip', '.tar', '.gz', '.rar', '.7z'],
            'audio': ['.mp3', '.wav', '.flac', '.aac', '.ogg'],
            'video': ['.mp4', '.avi', '.mkv', '.mov', '.webm']
        }

        files = []
        for pattern in patterns:
            files.extend([f for f in self.project_path.glob(pattern) if f.is_file()])

        dest_path = self.project_path / destination
        organized = []
        errors = []

        for file in files:
            ext = file.suffix.lower()
            folder = 'other'

            for type_name, extensions in type_folders.items():
                if ext in extensions:
                    folder = type_name
                    break

            target_dir = dest_path / folder
            target_path = target_dir / file.name

            try:
                if dry_run:
                    organized.append({
                        "file": str(file),
                        "destination": str(target_path),
                        "type": folder,
                        "dry_run": True
                    })
                else:
                    target_dir.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(file), str(target_path))
                    organized.append({
                        "file": str(file),
                        "destination": str(target_path),
                        "type": folder
                    })
            except Exception as e:
                errors.append({"file": str(file), "error": str(e)})

        self.operations_count += len(organized)

        return {
            "success": len(errors) == 0,
            "operation": "organize",
            "organized": len(organized),
            "by_type": {t: len([o for o in organized if o.get('type') == t]) for t in type_folders.keys()},
            "errors": errors if errors else None,
            "dry_run": dry_run
        }

    def _rollback_last(self) -> Dict[str, Any]:
        """
        Rollback the last operation
        """
        if not self._rollback_stack:
            return {"success": False, "error": "No operations to rollback"}

        last_op = self._rollback_stack.pop()
        operation = last_op['operation']
        data = last_op['data']
        restored = []
        errors = []

        console.print(f"[yellow]⏪ Rolling back: {operation}[/yellow]")

        if operation == 'parallel_transform':
            for item in data:
                try:
                    Path(item['file']).write_text(item['original'], encoding='utf-8')
                    restored.append(item['file'])
                except Exception as e:
                    errors.append({"file": item['file'], "error": str(e)})

        elif operation == 'bulk_rename':
            for item in data:
                try:
                    Path(item['from']).rename(Path(item['to']))
                    restored.append(item['to'])
                except Exception as e:
                    errors.append({"file": item['from'], "error": str(e)})

        return {
            "success": len(errors) == 0,
            "operation": "rollback",
            "rolled_back": operation,
            "restored": len(restored),
            "errors": errors if errors else None
        }

    def _get_status(self) -> Dict[str, Any]:
        """
        Get batch agent status and statistics
        """
        return {
            "success": True,
            "operation": "status",
            "operations_count": self.operations_count,
            "rollback_stack_size": len(self._rollback_stack),
            "history_size": len(self.history),
            "max_workers": self.max_workers,
            "project_path": str(self.project_path)
        }

    def get_stats(self) -> Dict[str, Any]:
        """Get operation statistics"""
        return {
            "operations_count": self.operations_count,
            "rollback_available": len(self._rollback_stack) > 0,
            "max_workers": self.max_workers
        }
