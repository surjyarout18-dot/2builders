import os

def is_serverless() -> bool:
    return bool(
        os.getenv("VERCEL")
        or os.getenv("VERCEL_ENV")
        or os.getenv("VERCEL_REGION")
        or os.getenv("AWS_LAMBDA_FUNCTION_NAME")
        or os.getenv("LAMBDA_TASK_ROOT")
    )

if is_serverless():
    UPLOAD_DIR = "/tmp/uploads"
    EXPORT_DIR = "/tmp/exports"
    DEFAULT_DB = "/tmp/twobuilders.db"
else:
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
    EXPORT_DIR = os.path.join(BASE_DIR, "exports")
    DEFAULT_DB = "./twobuilders.db"

try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(EXPORT_DIR, exist_ok=True)
except Exception as e:
    print(f"Warning initializing directories: {e}")
