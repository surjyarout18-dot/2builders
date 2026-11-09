import os
import sys
import tempfile

def is_serverless() -> bool:
    if os.getenv("VERCEL") or os.getenv("VERCEL_ENV") or os.getenv("VERCEL_REGION"):
        return True
    if os.getenv("AWS_LAMBDA_FUNCTION_NAME") or os.getenv("LAMBDA_TASK_ROOT"):
        return True
    if os.path.exists("/var/task"):
        return True
    # Test if local folder is writable
    try:
        test_path = os.path.join(os.path.dirname(__file__), ".write_test")
        with open(test_path, "w") as f:
            f.write("1")
        os.remove(test_path)
        return False
    except Exception:
        return True

if is_serverless():
    BASE_TEMP = os.environ.get("TMPDIR", "/tmp")
    UPLOAD_DIR = os.path.join(BASE_TEMP, "uploads")
    EXPORT_DIR = os.path.join(BASE_TEMP, "exports")
    DEFAULT_DB = os.path.join(BASE_TEMP, "twobuilders.db")
else:
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
    EXPORT_DIR = os.path.join(BASE_DIR, "exports")
    DEFAULT_DB = os.path.join(BASE_DIR, "twobuilders.db")

def ensure_dir(path: str):
    """Ensure directory exists with fallback to system temp."""
    try:
        os.makedirs(path, exist_ok=True)
    except Exception:
        pass

def ensure_all_directories():
    global UPLOAD_DIR, EXPORT_DIR
    for d in (UPLOAD_DIR, EXPORT_DIR):
        try:
            os.makedirs(d, exist_ok=True)
        except Exception:
            sys_tmp = tempfile.gettempdir()
            UPLOAD_DIR = os.path.join(sys_tmp, "uploads")
            EXPORT_DIR = os.path.join(sys_tmp, "exports")
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            os.makedirs(EXPORT_DIR, exist_ok=True)
            break

ensure_all_directories()
