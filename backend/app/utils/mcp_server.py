"""
MCP (Model Context Protocol) server implementation for TestAgent.
Provides tools for Claude Desktop/Code/Cursor to interact with the testing platform.
"""

import asyncio
import json
import uuid
from typing import Any, AsyncGenerator

from fastapi import Request, Response
from fastapi.responses import StreamingResponse

# MCP protocol constants
JSONRPC_VERSION = "2.0"
MCP_PROTOCOL_VERSION = "2024-11-05"

# In-memory session storage for SSE connections
_sessions: dict[str, asyncio.Queue] = {}


# ─── Tool Definitions ──────────────────────────────────────────────────────────

MCP_TOOLS = [
    {
        "name": "run_test",
        "description": "Run a new test against a target URL using AI-powered browser automation. Supports UAT testing with Browser Use, UI auditing with Midscene.js, and UX auditing with Playwright MCP.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "A descriptive name for the test",
                },
                "target_url": {
                    "type": "string",
                    "description": "The URL to test (must be http or https)",
                },
                "engine": {
                    "type": "string",
                    "enum": ["browser_use", "midscene", "playwright_mcp"],
                    "description": "Testing engine: browser_use (UAT), midscene (UI audit), playwright_mcp (UX audit)",
                },
                "instructions": {
                    "type": "string",
                    "description": "Natural language test instructions",
                },
                "llm_provider": {
                    "type": "string",
                    "enum": ["ollama", "openai", "anthropic"],
                    "description": "LLM provider to use",
                    "default": "ollama",
                },
                "llm_model": {
                    "type": "string",
                    "description": "Model name (e.g., llama3.1, gpt-4o, claude-sonnet-4-20250514)",
                    "default": "llama3.1",
                },
            },
            "required": ["name", "target_url", "engine", "instructions"],
        },
    },
    {
        "name": "get_test_result",
        "description": "Get the detailed result of a specific test including all steps, screenshots, and status.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "test_id": {
                    "type": "string",
                    "description": "UUID of the test to retrieve",
                },
            },
            "required": ["test_id"],
        },
    },
    {
        "name": "list_tests",
        "description": "List recent tests with optional filtering by status or engine type.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["pending", "running", "passed", "failed", "error"],
                    "description": "Filter by test status",
                },
                "engine": {
                    "type": "string",
                    "enum": ["browser_use", "midscene", "playwright_mcp"],
                    "description": "Filter by testing engine",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of results",
                    "default": 10,
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_stats",
        "description": "Get testing statistics including total tests, pass rate, average duration, and cost metrics.",
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
]


# ─── Tool Execution ────────────────────────────────────────────────────────────

async def execute_tool(tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """Execute an MCP tool and return the result."""
    from app.database import async_session_factory
    from app.models.user import User
    from app.models.test import Test
    from app.services.test_service import TestService
    from app.schemas.test import CreateTestSchema, TestListFilters
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    async with async_session_factory() as db:
        # For MCP, use the first admin user as the acting user
        result = await db.execute(select(User).where(User.role == "admin").limit(1))
        user = result.scalar_one_or_none()
        if not user:
            return {"error": "No admin user found. Register a user first."}

        if tool_name == "run_test":
            try:
                data = CreateTestSchema(
                    name=arguments["name"],
                    target_url=arguments["target_url"],
                    engine=arguments["engine"],
                    instructions=arguments["instructions"],
                    llm_provider=arguments.get("llm_provider", "ollama"),
                    llm_model=arguments.get("llm_model", "llama3.1"),
                )
                test = await TestService.create_test(db, user.id, data)
                await db.commit()
                TestService.enqueue(test.id, test.engine)
                return {
                    "test_id": str(test.id),
                    "status": "pending",
                    "message": f"Test '{test.name}' created and queued for execution.",
                }
            except Exception as e:
                return {"error": str(e)}

        elif tool_name == "get_test_result":
            try:
                test_id = uuid.UUID(arguments["test_id"])
                test = await TestService.get_test(db, test_id)

                steps = []
                for step in test.steps:
                    steps.append({
                        "step_number": step.step_number,
                        "action": step.action,
                        "expected": step.expected,
                        "actual": step.actual,
                        "status": step.status,
                        "error_message": step.error_message,
                        "duration_ms": step.duration_ms,
                    })

                return {
                    "test_id": str(test.id),
                    "name": test.name,
                    "target_url": test.target_url,
                    "engine": test.engine,
                    "status": test.status,
                    "total_steps": test.total_steps,
                    "passed_steps": test.passed_steps,
                    "failed_steps": test.failed_steps,
                    "duration_ms": test.duration_ms,
                    "tokens_used": test.tokens_used,
                    "summary": test.summary,
                    "steps": steps,
                    "created_at": test.created_at.isoformat() if test.created_at else None,
                    "completed_at": test.completed_at.isoformat() if test.completed_at else None,
                }
            except Exception as e:
                return {"error": str(e)}

        elif tool_name == "list_tests":
            try:
                filters = TestListFilters(
                    status=arguments.get("status"),
                    engine=arguments.get("engine"),
                    page=1,
                    per_page=arguments.get("limit", 10),
                )
                paginated = await TestService.list_tests(db, user.id, filters)
                return {
                    "total": paginated.total,
                    "tests": [
                        {
                            "test_id": str(t.id),
                            "name": t.name,
                            "target_url": t.target_url,
                            "engine": t.engine,
                            "status": t.status,
                            "total_steps": t.total_steps,
                            "passed_steps": t.passed_steps,
                            "failed_steps": t.failed_steps,
                            "created_at": t.created_at.isoformat() if t.created_at else None,
                        }
                        for t in paginated.items
                    ],
                }
            except Exception as e:
                return {"error": str(e)}

        elif tool_name == "get_stats":
            try:
                stats = await TestService.get_stats(db, user.id)
                return stats
            except Exception as e:
                return {"error": str(e)}

        else:
            return {"error": f"Unknown tool: {tool_name}"}


# ─── JSON-RPC Handling ─────────────────────────────────────────────────────────

def make_jsonrpc_response(req_id: Any, result: Any) -> dict:
    return {
        "jsonrpc": JSONRPC_VERSION,
        "id": req_id,
        "result": result,
    }


def make_jsonrpc_error(req_id: Any, code: int, message: str) -> dict:
    return {
        "jsonrpc": JSONRPC_VERSION,
        "id": req_id,
        "error": {"code": code, "message": message},
    }


async def handle_jsonrpc_request(request_body: dict) -> dict:
    """Handle a single JSON-RPC request and return a response."""
    req_id = request_body.get("id")
    method = request_body.get("method", "")
    params = request_body.get("params", {})

    if method == "initialize":
        return make_jsonrpc_response(req_id, {
            "protocolVersion": MCP_PROTOCOL_VERSION,
            "capabilities": {
                "tools": {"listChanged": False},
            },
            "serverInfo": {
                "name": "testagent",
                "version": "0.1.0",
            },
        })

    elif method == "notifications/initialized":
        # This is a notification, no response needed
        return make_jsonrpc_response(req_id, {})

    elif method == "tools/list":
        return make_jsonrpc_response(req_id, {
            "tools": MCP_TOOLS,
        })

    elif method == "tools/call":
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})
        result = await execute_tool(tool_name, arguments)

        is_error = "error" in result
        return make_jsonrpc_response(req_id, {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps(result, indent=2, default=str),
                }
            ],
            "isError": is_error,
        })

    elif method == "ping":
        return make_jsonrpc_response(req_id, {})

    else:
        return make_jsonrpc_error(req_id, -32601, f"Method not found: {method}")


# ─── SSE Transport ─────────────────────────────────────────────────────────────

async def get_mcp_sse_response(request: Request) -> StreamingResponse:
    """Create an SSE connection for MCP communication."""
    session_id = str(uuid.uuid4())
    queue: asyncio.Queue = asyncio.Queue()
    _sessions[session_id] = queue

    messages_url = f"/mcp/messages?session_id={session_id}"

    async def event_stream() -> AsyncGenerator[str, None]:
        # Send the endpoint event first
        yield f"event: endpoint\ndata: {messages_url}\n\n"

        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"event: message\ndata: {json.dumps(message)}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive comment
                    yield ": keepalive\n\n"
        finally:
            _sessions.pop(session_id, None)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def handle_mcp_message(request: Request) -> Response:
    """Handle incoming MCP JSON-RPC messages and route responses to the SSE stream."""
    session_id = request.query_params.get("session_id", "")
    queue = _sessions.get(session_id)

    if not queue:
        return Response(
            content=json.dumps({"error": "Invalid or expired session"}),
            status_code=400,
            media_type="application/json",
        )

    try:
        body = await request.json()
    except Exception:
        return Response(
            content=json.dumps({"error": "Invalid JSON"}),
            status_code=400,
            media_type="application/json",
        )

    response = await handle_jsonrpc_request(body)

    # Put the response on the session's SSE queue
    await queue.put(response)

    # Also return 202 Accepted
    return Response(status_code=202)
