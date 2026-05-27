import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.mcp_token import MCPToken
from app.schemas.mcp import CreateMCPTokenSchema, MCPTokenResponse
from app.config import get_settings

settings = get_settings()
router = APIRouter(tags=["MCP"])


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# ─── MCP SSE Transport ─────────────────────────────────────────────────────────

@router.get("/mcp/sse")
async def mcp_sse(request: Request) -> StreamingResponse:
    """MCP SSE endpoint for Claude Desktop/Code/Cursor integration."""
    from app.utils.mcp_server import get_mcp_sse_response
    return await get_mcp_sse_response(request)


@router.post("/mcp/messages")
async def mcp_messages(request: Request) -> Response:
    """MCP message handler for JSON-RPC requests."""
    from app.utils.mcp_server import handle_mcp_message
    return await handle_mcp_message(request)


# ─── MCP Token Management ──────────────────────────────────────────────────────

@router.get("/api/mcp/tokens", response_model=list[MCPTokenResponse])
async def list_mcp_tokens(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MCPTokenResponse]:
    result = await db.execute(
        select(MCPToken)
        .where(MCPToken.created_by == current_user.id)
        .order_by(MCPToken.created_at.desc())
    )
    tokens = result.scalars().all()
    return [
        MCPTokenResponse(
            id=t.id,
            name=t.name,
            last_used_at=t.last_used_at,
            expires_at=t.expires_at,
            is_active=t.is_active,
            created_at=t.created_at,
        )
        for t in tokens
    ]


@router.post("/api/mcp/tokens", response_model=MCPTokenResponse, status_code=201)
async def create_mcp_token(
    data: CreateMCPTokenSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MCPTokenResponse:
    raw_token = f"ta_{secrets.token_urlsafe(32)}"
    token_hashed = hash_token(raw_token)

    expires_at = None
    if data.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)

    mcp_token = MCPToken(
        name=data.name,
        token_hash=token_hashed,
        created_by=current_user.id,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(mcp_token)
    await db.flush()

    return MCPTokenResponse(
        id=mcp_token.id,
        name=mcp_token.name,
        token=raw_token,  # Only returned on creation
        last_used_at=None,
        expires_at=expires_at,
        is_active=True,
        created_at=mcp_token.created_at,
    )


@router.delete("/api/mcp/tokens/{token_id}", status_code=204)
async def delete_mcp_token(
    token_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(MCPToken).where(MCPToken.id == token_id, MCPToken.created_by == current_user.id)
    )
    token = result.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    await db.delete(token)


@router.get("/api/mcp/config")
async def get_mcp_config(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return MCP configuration for Claude Desktop/Code."""
    base_url = settings.FRONTEND_URL.replace(":3000", ":8000")
    return {
        "mcpServers": {
            "testagent": {
                "transport": {
                    "type": "sse",
                    "url": f"{base_url}/mcp/sse",
                },
                "description": "TestAgent - AI-powered testing platform",
            }
        },
        "instructions": (
            "Add the above configuration to your Claude Desktop config file "
            "(~/.claude/claude_desktop_config.json) or your editor's MCP settings. "
            "Create an MCP token in TestAgent and include it as a bearer token header."
        ),
    }
