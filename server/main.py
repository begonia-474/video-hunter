"""FastAPI entry point for the f2 GUI backend.

Start the server::

    python main.py              # default port 18224
    python main.py --port 9000  # custom port
"""

from __future__ import annotations

import argparse
import json

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import config, history, platforms, tasks
from core.history_db import init_db
from utils.config import ensure_default_config, get_app_yaml_path

app = FastAPI(title="f2 GUI Server", version="0.1.0")

# CORS -- allow everything during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(platforms.router)
app.include_router(config.router)
app.include_router(tasks.router)
app.include_router(history.router)


@app.on_event("startup")
async def on_startup() -> None:
    """Initialize resources and announce readiness on stdout."""
    # Make sure a default config exists so config routes don't 404 on first run
    ensure_default_config(get_app_yaml_path())

    # Initialize SQLite history database
    init_db()

    port = getattr(app.state, "port", 18224)
    ready_msg = json.dumps({"port": port, "status": "ready"})
    print(ready_msg, flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="f2 GUI FastAPI server")
    parser.add_argument("--port", type=int, default=18224, help="Port to listen on (default: 18224)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind (default: 127.0.0.1)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    app.state.port = args.port
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
