import os
import shutil
import logging
from pathlib import Path

logger = logging.getLogger("music_phrase_analyzer.cleanup")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"


def cleanup_directory(target_dir: Path, keep_gitkeep: bool = True) -> int:
    """
    Safely removes all files and subdirectories inside target_dir.
    Preserves .gitkeep if keep_gitkeep is True.
    Returns the number of deleted items.
    """
    if not target_dir.exists() or not target_dir.is_dir():
        logger.warning(f"Target directory does not exist or is not a directory: {target_dir}")
        return 0

    deleted_count = 0

    for item in target_dir.iterdir():
        if keep_gitkeep and item.name == ".gitkeep":
            continue

        try:
            if item.is_dir():
                shutil.rmtree(item)
                deleted_count += 1
                logger.info(f"Deleted directory: {item.name}")
            elif item.is_file() or item.is_symlink():
                item.unlink()
                deleted_count += 1
                logger.info(f"Deleted file: {item.name}")
        except Exception as e:
            logger.error(f"Failed to delete {item}: {e}")

    return deleted_count


def cleanup_all_temp_data(keep_gitkeep: bool = True) -> dict:
    """
    Cleans up both uploaded files and generated outputs (stems, MIDIs, reports).
    """
    logger.info("Starting cleanup of uploads and outputs directories...")
    deleted_uploads = cleanup_directory(UPLOADS_DIR, keep_gitkeep=keep_gitkeep)
    deleted_outputs = cleanup_directory(OUTPUTS_DIR, keep_gitkeep=keep_gitkeep)

    result = {
        "status": "success",
        "deleted_uploads": deleted_uploads,
        "deleted_outputs": deleted_outputs,
        "total_deleted": deleted_uploads + deleted_outputs
    }
    logger.info(f"Cleanup completed: {result}")
    return result
