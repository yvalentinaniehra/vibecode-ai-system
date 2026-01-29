"""
Unit tests for Batch Agent
"""
import pytest
from pathlib import Path
from agents.batch_agent import BatchAgent, BatchTask, BatchResult


class TestBatchAgent:
    """Test BatchAgent functionality"""

    def test_init(self, temp_project_dir):
        """Test BatchAgent initialization"""
        agent = BatchAgent(str(temp_project_dir))

        assert agent.project_path == temp_project_dir
        assert agent.max_workers == 4
        assert agent.operations_count == 0

    def test_init_custom_workers(self, temp_project_dir):
        """Test BatchAgent with custom worker count"""
        agent = BatchAgent(str(temp_project_dir), max_workers=8)

        assert agent.max_workers == 8

    def test_execute_unknown_operation(self, temp_project_dir):
        """Test executing an unknown operation"""
        agent = BatchAgent(str(temp_project_dir))

        result = agent.execute("unknown_operation")

        assert result["success"] is False
        assert "Unknown operation" in result["error"]

    def test_get_status(self, temp_project_dir):
        """Test getting agent status"""
        agent = BatchAgent(str(temp_project_dir))

        result = agent.execute("status")

        assert result["success"] is True
        assert result["operation"] == "status"
        assert "operations_count" in result
        assert "max_workers" in result


class TestBatchAgentFindFiles(TestBatchAgent):
    """Test file finding operations"""

    def test_find_python_files(self, sample_files):
        """Test finding Python files"""
        agent = BatchAgent(str(sample_files))

        result = agent.execute("parallel_transform", ["**/*.py"], {
            "find": "nonexistent_string",
            "dry_run": True
        })

        assert result["success"] is True
        assert result["total_files"] >= 2  # file1.py, file2.py, src/module.py


class TestBatchAgentTransform(TestBatchAgent):
    """Test transform operations"""

    def test_parallel_transform_dry_run(self, sample_files):
        """Test parallel transform in dry run mode"""
        agent = BatchAgent(str(sample_files))

        result = agent.execute("parallel_transform", ["**/*.py"], {
            "find": "print",
            "replace": "logging.info",
            "dry_run": True
        })

        assert result["success"] is True
        assert result["dry_run"] is True
        assert result["transformed"] >= 1

        # Verify files weren't actually changed
        content = (sample_files / "file1.py").read_text()
        assert "print" in content

    def test_parallel_transform_actual(self, sample_files):
        """Test parallel transform actually modifies files"""
        agent = BatchAgent(str(sample_files))

        result = agent.execute("parallel_transform", ["**/*.py"], {
            "find": "hello",
            "replace": "HELLO",
            "dry_run": False
        })

        assert result["success"] is True
        assert result["dry_run"] is False

        # Verify file was changed
        content = (sample_files / "file1.py").read_text()
        assert "HELLO" in content
        assert "hello" not in content

    def test_parallel_transform_regex(self, sample_files):
        """Test parallel transform with regex"""
        agent = BatchAgent(str(sample_files))

        result = agent.execute("parallel_transform", ["**/*.py"], {
            "find": r"print\(['\"](\w+)['\"]\)",
            "replace": r"log('\1')",
            "regex": True,
            "dry_run": True
        })

        assert result["success"] is True

    def test_parallel_transform_no_find_pattern(self, sample_files):
        """Test transform without find pattern returns error"""
        agent = BatchAgent(str(sample_files))

        result = agent.execute("parallel_transform", ["**/*.py"], {
            "replace": "something"
        })

        assert result["success"] is False
        assert "Find pattern required" in result["error"]


class TestBatchAgentBulkRename(TestBatchAgent):
    """Test bulk rename operations"""

    def test_bulk_rename_dry_run(self, sample_files):
        """Test bulk rename in dry run mode"""
        agent = BatchAgent(str(sample_files))

        result = agent.execute("bulk_rename", ["*.py"], {
            "template": "renamed_{name}",
            "dry_run": True
        })

        assert result["success"] is True
        assert len(result["renamed"]) >= 2

        # Verify files weren't actually renamed
        assert (sample_files / "file1.py").exists()

    def test_bulk_rename_with_counter(self, sample_files):
        """Test bulk rename with counter template"""
        agent = BatchAgent(str(sample_files))

        result = agent.execute("bulk_rename", ["*.py"], {
            "template": "file_{counter_pad}",
            "dry_run": True
        })

        assert result["success"] is True
        # Check that counter is used in names
        renamed_names = [r["to"] for r in result["renamed"]]
        assert any("0001" in name or "0002" in name for name in renamed_names)


class TestBatchAgentArchive(TestBatchAgent):
    """Test archive operations"""

    def test_archive_dry_run(self, sample_files):
        """Test archive in dry run mode"""
        agent = BatchAgent(str(sample_files))

        result = agent.execute("archive", ["**/*.py"], {
            "output": "backup.zip",
            "dry_run": True
        })

        assert result["success"] is True
        assert result["dry_run"] is True
        assert result["files_count"] >= 2

    def test_archive_actual(self, sample_files):
        """Test actual archive creation"""
        agent = BatchAgent(str(sample_files))

        result = agent.execute("archive", ["**/*.py"], {
            "output": "backup.zip",
            "format": "zip",
            "dry_run": False
        })

        assert result["success"] is True
        assert (sample_files / "backup.zip").exists()
        assert result["size"] > 0

    def test_extract_archive(self, sample_files):
        """Test extracting an archive"""
        agent = BatchAgent(str(sample_files))

        # First create an archive
        agent.execute("archive", ["*.py"], {
            "output": "test.zip",
            "dry_run": False
        })

        # Then extract it
        result = agent.execute("extract", options={
            "archive": "test.zip",
            "destination": "extracted",
            "dry_run": False
        })

        assert result["success"] is True
        assert (sample_files / "extracted").exists()


class TestBatchAgentDeduplicate(TestBatchAgent):
    """Test deduplication operations"""

    def test_deduplicate_dry_run(self, sample_files):
        """Test deduplication in dry run mode"""
        # Create duplicate files
        content = "duplicate content"
        (sample_files / "dup1.txt").write_text(content)
        (sample_files / "dup2.txt").write_text(content)

        agent = BatchAgent(str(sample_files))

        result = agent.execute("deduplicate", ["*.txt"], {
            "dry_run": True
        })

        assert result["success"] is True
        assert result["duplicates_found"] >= 1
        assert result["deleted"] == 0  # Dry run


class TestBatchAgentOrganize(TestBatchAgent):
    """Test file organization operations"""

    def test_organize_by_type_dry_run(self, sample_files):
        """Test organizing files by type in dry run mode"""
        agent = BatchAgent(str(sample_files))

        result = agent.execute("organize", ["*.*"], {
            "destination": "organized",
            "dry_run": True
        })

        assert result["success"] is True
        assert result["organized"] >= 1
        assert "by_type" in result


class TestBatchAgentSync(TestBatchAgent):
    """Test directory sync operations"""

    def test_sync_directories(self, sample_files):
        """Test syncing directories"""
        # Create source and destination
        src = sample_files / "sync_src"
        dst = sample_files / "sync_dst"
        src.mkdir()
        dst.mkdir()

        (src / "file1.txt").write_text("content1")
        (src / "file2.txt").write_text("content2")

        agent = BatchAgent(str(sample_files))

        result = agent.execute("sync", options={
            "source": "sync_src",
            "destination": "sync_dst",
            "dry_run": False
        })

        assert result["success"] is True
        assert result["copied"] == 2
        assert (dst / "file1.txt").exists()
        assert (dst / "file2.txt").exists()


class TestBatchAgentPipeline(TestBatchAgent):
    """Test pipeline operations"""

    def test_empty_pipeline(self, sample_files):
        """Test pipeline with no steps"""
        agent = BatchAgent(str(sample_files))

        result = agent.execute("pipeline", options={
            "steps": []
        })

        assert result["success"] is False
        assert "No pipeline steps" in result["error"]

    def test_pipeline_with_steps(self, sample_files):
        """Test pipeline with multiple steps"""
        agent = BatchAgent(str(sample_files))

        result = agent.execute("pipeline", options={
            "steps": [
                {
                    "name": "Get Status",
                    "operation": "status"
                }
            ]
        })

        assert result["success"] is True
        assert result["steps_completed"] == 1


class TestBatchAgentRollback(TestBatchAgent):
    """Test rollback operations"""

    def test_rollback_empty_stack(self, sample_files):
        """Test rollback with empty stack"""
        agent = BatchAgent(str(sample_files))

        result = agent.execute("rollback")

        assert result["success"] is False
        assert "No operations to rollback" in result["error"]

    def test_rollback_transform(self, sample_files):
        """Test rollback after transform"""
        agent = BatchAgent(str(sample_files))

        # Perform transform
        agent.execute("parallel_transform", ["*.py"], {
            "find": "hello",
            "replace": "REPLACED",
            "dry_run": False
        })

        # Verify change
        content = (sample_files / "file1.py").read_text()
        assert "REPLACED" in content

        # Rollback
        result = agent.execute("rollback")

        assert result["success"] is True
        assert result["rolled_back"] == "parallel_transform"

        # Verify rollback
        content = (sample_files / "file1.py").read_text()
        assert "hello" in content


class TestBatchAgentStats(TestBatchAgent):
    """Test statistics tracking"""

    def test_get_stats(self, sample_files):
        """Test getting operation statistics"""
        agent = BatchAgent(str(sample_files))

        stats = agent.get_stats()

        assert "operations_count" in stats
        assert "rollback_available" in stats
        assert "max_workers" in stats

    def test_operations_count_increments(self, sample_files):
        """Test that operations count increments"""
        agent = BatchAgent(str(sample_files))

        initial_count = agent.operations_count

        agent.execute("parallel_transform", ["*.py"], {
            "find": "hello",
            "replace": "world",
            "dry_run": False
        })

        assert agent.operations_count > initial_count
