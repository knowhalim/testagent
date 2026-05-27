from app.routers.auth import router as auth_router
from app.routers.tests import router as tests_router
from app.routers.admin import router as admin_router
from app.routers.dashboard import router as dashboard_router
from app.routers.mcp import router as mcp_router

__all__ = ["auth_router", "tests_router", "admin_router", "dashboard_router", "mcp_router"]
