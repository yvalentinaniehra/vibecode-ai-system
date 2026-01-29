"""
Antigravity Agent - Batch operations and file processing
Handles: batch, bulk, migrate, scaffold, generate, template
"""
import sys
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import shutil

# Fix Windows encoding
if sys.platform == 'win32':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn

console = Console(force_terminal=True)


class AntigravityAgent:
    """Batch operations agent for file processing and scaffolding"""

    def __init__(self, project_path: str = None):
        self.project_path = Path(project_path or os.getcwd())
        self.operations_count = 0
        self.errors: List[str] = []

    def execute(
        self,
        operation: str,
        targets: List[str] = None,
        options: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Execute a batch operation

        Args:
            operation: Type of operation (rename, move, copy, delete, transform)
            targets: List of file patterns or paths
            options: Operation-specific options
        """
        console.print(f"[magenta]🚀 Antigravity Agent executing: {operation}[/magenta]")

        options = options or {}
        targets = targets or []

        try:
            if operation == 'rename':
                return self._batch_rename(targets, options)
            elif operation == 'move':
                return self._batch_move(targets, options)
            elif operation == 'copy':
                return self._batch_copy(targets, options)
            elif operation == 'delete':
                return self._batch_delete(targets, options)
            elif operation == 'scaffold':
                return self._scaffold_project(options)
            elif operation == 'transform':
                return self._batch_transform(targets, options)
            elif operation == 'find':
                return self._find_files(targets, options)
            else:
                return {"success": False, "error": f"Unknown operation: {operation}"}

        except Exception as e:
            console.print(f"[red]❌ Batch Error: {str(e)}[/red]")
            return {"success": False, "error": str(e)}

    def _batch_rename(self, patterns: List[str], options: Dict) -> Dict[str, Any]:
        """Batch rename files"""
        from_ext = options.get('from_ext', '')
        to_ext = options.get('to_ext', '')
        prefix = options.get('prefix', '')
        suffix = options.get('suffix', '')
        dry_run = options.get('dry_run', False)

        renamed = []
        errors = []

        for pattern in patterns:
            files = list(self.project_path.glob(pattern))

            for file in files:
                try:
                    new_name = file.stem

                    if prefix:
                        new_name = prefix + new_name
                    if suffix:
                        new_name = new_name + suffix

                    new_ext = to_ext if to_ext else file.suffix
                    if not new_ext.startswith('.'):
                        new_ext = '.' + new_ext

                    new_path = file.parent / (new_name + new_ext)

                    if dry_run:
                        renamed.append({"from": str(file), "to": str(new_path), "dry_run": True})
                    else:
                        file.rename(new_path)
                        renamed.append({"from": str(file), "to": str(new_path)})

                except Exception as e:
                    errors.append({"file": str(file), "error": str(e)})

        self.operations_count += len(renamed)

        return {
            "success": len(errors) == 0,
            "operation": "rename",
            "renamed": renamed,
            "count": len(renamed),
            "errors": errors
        }

    def _batch_move(self, patterns: List[str], options: Dict) -> Dict[str, Any]:
        """Batch move files"""
        destination = options.get('destination', '')
        dry_run = options.get('dry_run', False)

        if not destination:
            return {"success": False, "error": "Destination required"}

        dest_path = self.project_path / destination
        if not dry_run:
            dest_path.mkdir(parents=True, exist_ok=True)

        moved = []
        errors = []

        for pattern in patterns:
            files = list(self.project_path.glob(pattern))

            for file in files:
                try:
                    new_path = dest_path / file.name

                    if dry_run:
                        moved.append({"from": str(file), "to": str(new_path), "dry_run": True})
                    else:
                        shutil.move(str(file), str(new_path))
                        moved.append({"from": str(file), "to": str(new_path)})

                except Exception as e:
                    errors.append({"file": str(file), "error": str(e)})

        self.operations_count += len(moved)

        return {
            "success": len(errors) == 0,
            "operation": "move",
            "moved": moved,
            "count": len(moved),
            "errors": errors
        }

    def _batch_copy(self, patterns: List[str], options: Dict) -> Dict[str, Any]:
        """Batch copy files"""
        destination = options.get('destination', '')
        dry_run = options.get('dry_run', False)

        if not destination:
            return {"success": False, "error": "Destination required"}

        dest_path = self.project_path / destination
        if not dry_run:
            dest_path.mkdir(parents=True, exist_ok=True)

        copied = []
        errors = []

        for pattern in patterns:
            files = list(self.project_path.glob(pattern))

            for file in files:
                try:
                    new_path = dest_path / file.name

                    if dry_run:
                        copied.append({"from": str(file), "to": str(new_path), "dry_run": True})
                    else:
                        if file.is_dir():
                            shutil.copytree(str(file), str(new_path))
                        else:
                            shutil.copy2(str(file), str(new_path))
                        copied.append({"from": str(file), "to": str(new_path)})

                except Exception as e:
                    errors.append({"file": str(file), "error": str(e)})

        self.operations_count += len(copied)

        return {
            "success": len(errors) == 0,
            "operation": "copy",
            "copied": copied,
            "count": len(copied),
            "errors": errors
        }

    def _batch_delete(self, patterns: List[str], options: Dict) -> Dict[str, Any]:
        """Batch delete files (with safety checks)"""
        dry_run = options.get('dry_run', True)  # Default to dry_run for safety
        confirm = options.get('confirm', False)

        if not dry_run and not confirm:
            return {
                "success": False,
                "error": "Delete requires confirm=True or dry_run=True"
            }

        deleted = []
        errors = []

        for pattern in patterns:
            files = list(self.project_path.glob(pattern))

            for file in files:
                try:
                    if dry_run:
                        deleted.append({"file": str(file), "dry_run": True})
                    else:
                        if file.is_dir():
                            shutil.rmtree(str(file))
                        else:
                            file.unlink()
                        deleted.append({"file": str(file)})

                except Exception as e:
                    errors.append({"file": str(file), "error": str(e)})

        self.operations_count += len(deleted)

        return {
            "success": len(errors) == 0,
            "operation": "delete",
            "deleted": deleted,
            "count": len(deleted),
            "errors": errors
        }

    def _find_files(self, patterns: List[str], options: Dict) -> Dict[str, Any]:
        """Find files matching patterns"""
        found = []

        for pattern in patterns:
            files = list(self.project_path.glob(pattern))
            for file in files:
                found.append({
                    "path": str(file),
                    "name": file.name,
                    "is_dir": file.is_dir(),
                    "size": file.stat().st_size if file.is_file() else 0
                })

        return {
            "success": True,
            "operation": "find",
            "files": found,
            "count": len(found)
        }

    def _scaffold_project(self, options: Dict) -> Dict[str, Any]:
        """Scaffold a new project structure"""
        template = options.get('template', 'basic')
        name = options.get('name', 'new-project')
        dry_run = options.get('dry_run', False)

        templates = {
            'basic': {
                'dirs': ['src', 'tests', 'docs'],
                'files': {
                    'README.md': f'# {name}\n\nProject description here.',
                    'src/__init__.py': '',
                    'tests/__init__.py': '',
                    '.gitignore': '*.pyc\n__pycache__/\n.env\nvenv/\n'
                }
            },
            'python': {
                'dirs': ['src', 'tests', 'docs', 'scripts'],
                'files': {
                    'README.md': f'# {name}\n\nPython project.',
                    'requirements.txt': '',
                    'setup.py': f'from setuptools import setup\nsetup(name="{name}")',
                    'src/__init__.py': '',
                    'tests/__init__.py': '',
                    '.gitignore': '*.pyc\n__pycache__/\n.env\nvenv/\ndist/\n*.egg-info/'
                }
            },
            'nextjs': {
                'dirs': ['src/app', 'src/components', 'src/lib', 'public'],
                'files': {
                    'README.md': f'# {name}\n\nNext.js project.',
                    'package.json': f'{{"name": "{name}", "version": "1.0.0"}}',
                    '.gitignore': 'node_modules/\n.next/\n.env.local\n'
                }
            },
            'api': {
                'dirs': ['src/routes', 'src/models', 'src/services', 'tests'],
                'files': {
                    'README.md': f'# {name}\n\nAPI project.',
                    'src/__init__.py': '',
                    'src/app.py': '# Main application entry point',
                    '.gitignore': '*.pyc\n__pycache__/\n.env\nvenv/\n'
                }
            }
        }

        if template not in templates:
            return {"success": False, "error": f"Unknown template: {template}"}

        t = templates[template]
        project_path = self.project_path / name
        created = []

        try:
            if not dry_run:
                project_path.mkdir(parents=True, exist_ok=True)

            # Create directories
            for dir_name in t['dirs']:
                dir_path = project_path / dir_name
                if dry_run:
                    created.append({"type": "dir", "path": str(dir_path), "dry_run": True})
                else:
                    dir_path.mkdir(parents=True, exist_ok=True)
                    created.append({"type": "dir", "path": str(dir_path)})

            # Create files
            for file_name, content in t['files'].items():
                file_path = project_path / file_name
                if dry_run:
                    created.append({"type": "file", "path": str(file_path), "dry_run": True})
                else:
                    file_path.parent.mkdir(parents=True, exist_ok=True)
                    file_path.write_text(content, encoding='utf-8')
                    created.append({"type": "file", "path": str(file_path)})

            return {
                "success": True,
                "operation": "scaffold",
                "template": template,
                "project_path": str(project_path),
                "created": created,
                "count": len(created)
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    def _batch_transform(self, patterns: List[str], options: Dict) -> Dict[str, Any]:
        """Batch transform file contents"""
        find = options.get('find', '')
        replace = options.get('replace', '')
        dry_run = options.get('dry_run', False)

        if not find:
            return {"success": False, "error": "Find pattern required"}

        transformed = []
        errors = []

        for pattern in patterns:
            files = list(self.project_path.glob(pattern))

            for file in files:
                if file.is_dir():
                    continue

                try:
                    content = file.read_text(encoding='utf-8')
                    if find in content:
                        new_content = content.replace(find, replace)
                        matches = content.count(find)

                        if dry_run:
                            transformed.append({
                                "file": str(file),
                                "matches": matches,
                                "dry_run": True
                            })
                        else:
                            file.write_text(new_content, encoding='utf-8')
                            transformed.append({
                                "file": str(file),
                                "matches": matches
                            })

                except Exception as e:
                    errors.append({"file": str(file), "error": str(e)})

        self.operations_count += len(transformed)

        return {
            "success": len(errors) == 0,
            "operation": "transform",
            "transformed": transformed,
            "count": len(transformed),
            "errors": errors
        }

    def get_stats(self) -> Dict[str, Any]:
        """Get operation statistics"""
        return {
            "operations_count": self.operations_count,
            "errors_count": len(self.errors)
        }
