import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("splatsync")
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.auth.router import router as auth_router
from app.config import settings
from app.db import create_db
from app.sync.router import router as sync_router
from app.workouts.router import router as workouts_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SplatSync starting up")
    create_db()
    yield
    logger.info("SplatSync shutting down")


app = FastAPI(title="SplatSync", version="0.1.0", lifespan=lifespan)

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth_router)
app.include_router(workouts_router)
app.include_router(sync_router)


# Health check
@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "SplatSync"}


# Serve frontend in production
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

    # SPA catch-all: serve index.html for any non-API route
    @app.get("/{path:path}")
    async def serve_spa(request: Request, path: str):
        # If the file exists in static dir, serve it (favicon, etc.)
        file_path = static_dir / path
        if file_path.is_file():
            return FileResponse(file_path)
        # Otherwise serve index.html for client-side routing
        return FileResponse(static_dir / "index.html")
