import logging
import os

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import async_session_factory, engine
from app.dependencies import get_current_user

settings = get_settings()
logger = logging.getLogger("testagent")


async def run_migrations():
    """Run Alembic migrations programmatically on startup."""
    import asyncio
    from alembic.config import Config
    from alembic import command

    def _run():
        alembic_cfg = Config(os.path.join(os.path.dirname(os.path.dirname(__file__)), "alembic.ini"))
        alembic_cfg.set_main_option(
            "script_location",
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "alembic"),
        )
        command.upgrade(alembic_cfg, "head")

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _run)


async def seed_defaults():
    """Seed default settings on startup."""
    from app.services.settings_service import SettingsService

    async with async_session_factory() as db:
        try:
            await SettingsService.seed_defaults(db)
            await db.commit()
            logger.info("Default settings seeded successfully")
        except Exception as e:
            logger.warning(f"Could not seed default settings: {e}")
            await db.rollback()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    logger.info("Starting TestAgent backend...")

    # Ensure data directories exist
    os.makedirs(os.path.join(settings.DATA_DIR, "uploads"), exist_ok=True)
    os.makedirs(os.path.join(settings.DATA_DIR, "screenshots"), exist_ok=True)

    # Run migrations
    try:
        await run_migrations()
        logger.info("Database migrations completed")
    except Exception as e:
        logger.error(f"Migration failed: {e}. The app will start but the database may not be ready.")

    # Seed default settings
    try:
        await seed_defaults()
    except Exception as e:
        logger.error(f"Seeding defaults failed: {e}")

    yield

    # Shutdown
    await engine.dispose()
    logger.info("TestAgent backend shut down")


app = FastAPI(
    title="TestAgent",
    description="AI-powered testing platform API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Include Routers ────────────────────────────────────────────────────────────

from app.routers.auth import router as auth_router
from app.routers.tests import router as tests_router
from app.routers.admin import router as admin_router
from app.routers.dashboard import router as dashboard_router
from app.routers.mcp import router as mcp_router

app.include_router(auth_router, prefix="/api")
app.include_router(tests_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(mcp_router)  # MCP endpoints at root: /mcp/sse, /mcp/messages, /api/mcp/*


# ─── Health Check ───────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check() -> dict:
    return {
        "status": "healthy",
        "service": "testagent-backend",
        "version": "0.1.0",
    }


# ─── Static File Serving with Auth ─────────────────────────────────────────────

@app.get("/data/uploads/{file_path:path}")
async def serve_upload(
    file_path: str,
    current_user=Depends(get_current_user),
) -> FileResponse:
    """Serve uploaded files with authentication check."""
    full_path = os.path.join(settings.DATA_DIR, "uploads", file_path)
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Normalize to prevent path traversal
    real_path = os.path.realpath(full_path)
    allowed_base = os.path.realpath(os.path.join(settings.DATA_DIR, "uploads"))
    if not real_path.startswith(allowed_base):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return FileResponse(real_path)


@app.get("/data/screenshots/{file_path:path}")
async def serve_screenshot(
    file_path: str,
    current_user=Depends(get_current_user),
) -> FileResponse:
    """Serve screenshot files with authentication check."""
    full_path = os.path.join(settings.DATA_DIR, "screenshots", file_path)
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Normalize to prevent path traversal
    real_path = os.path.realpath(full_path)
    allowed_base = os.path.realpath(os.path.join(settings.DATA_DIR, "screenshots"))
    if not real_path.startswith(allowed_base):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return FileResponse(real_path)


# ─── Global Exception Handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )
