import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.services.cleanup_service import cleanup_all_temp_data, UPLOADS_DIR, OUTPUTS_DIR


def test_cleanup_service_removes_files_and_keeps_gitkeep():
    # Setup dummy files in uploads and outputs
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

    dummy_upload = UPLOADS_DIR / "dummy_test_song.wav"
    dummy_upload.write_bytes(b"RIFFdummydata")

    dummy_task_dir = OUTPUTS_DIR / "test-task-1234"
    dummy_task_dir.mkdir(parents=True, exist_ok=True)
    dummy_stem = dummy_task_dir / "vocals.wav"
    dummy_stem.write_bytes(b"RIFFstemdata")

    upload_gitkeep = UPLOADS_DIR / ".gitkeep"
    output_gitkeep = OUTPUTS_DIR / ".gitkeep"
    upload_gitkeep.touch(exist_ok=True)
    output_gitkeep.touch(exist_ok=True)

    assert dummy_upload.exists()
    assert dummy_stem.exists()
    assert dummy_task_dir.exists()

    # Perform cleanup
    result = cleanup_all_temp_data(keep_gitkeep=True)

    assert result["status"] == "success"
    assert result["total_deleted"] >= 2

    # Assert real state of filesystem
    assert not dummy_upload.exists()
    assert not dummy_stem.exists()
    assert not dummy_task_dir.exists()

    # .gitkeep must be preserved
    assert upload_gitkeep.exists()
    assert output_gitkeep.exists()


def test_cleanup_endpoint_via_testclient():
    client = TestClient(app)

    # Setup dummy file
    dummy_file = UPLOADS_DIR / "endpoint_test.wav"
    dummy_file.write_bytes(b"RIFFendpoint")

    assert dummy_file.exists()

    res = client.post("/cleanup")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"

    assert not dummy_file.exists()
