import sys

try:
    import psycopg  # noqa: F401
except ModuleNotFoundError:
    sys.exit(
        "psycopg is not installed in this Python interpreter.\n"
        "Use the project virtualenv instead of a global/Anaconda Python:\n"
        "  backend\\.venv\\Scripts\\python.exe -m uvicorn app.main:app "
        "--reload --host 127.0.0.1 --port 8000\n"
        "or run backend\\start.bat."
    )

import uvicorn

uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)