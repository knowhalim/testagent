# TestAgent

Self-hosted AI-powered testing platform. Run UAT, UI audits, and UX/accessibility audits on any website using natural language.

No scripting. No selectors. Just describe what you want to test.

## What It Does

| Engine | Tool | What It Tests |
|---|---|---|
| **UAT** | Browser Use | Simulates real user flows end-to-end |
| **UI Audit** | Midscene.js | Vision-based visual correctness checks |
| **UX Audit** | Playwright MCP | Accessibility tree analysis, ARIA compliance |

**Two LLM modes:**
- **$0 mode** — Ollama with local models (no API costs)
- **Best accuracy** — OpenAI or Anthropic API keys

## Quick Start (Docker)

```bash
git clone https://github.com/knowhalim/testagent.git
cd testagent
cp .env.example .env
docker compose up -d
```

Visit `http://localhost:3000`. First registered user becomes admin.

**With Ollama ($0 mode):**

```bash
docker compose -f docker-compose.yml -f docker-compose.ollama.yml up -d
```

## Quick Start (Native / No Docker)

**Prerequisites:** PostgreSQL 16, Redis 7, Python 3.12+, Node 20+

```bash
# Start databases
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis

# Create database
createdb testagent

# Backend
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e .
pip install email-validator bcrypt==4.2.1 langchain-openai langchain-anthropic langchain-community langchain

# Create .env
cat > .env << 'EOF'
DATABASE_URL=postgresql+asyncpg://$(whoami)@localhost:5432/testagent
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=change-me-in-production
NODE_WORKER_URL=http://localhost:4000
DATA_DIR=$(pwd)/../data
FRONTEND_URL=http://localhost:3000
EOF

# Start backend
uvicorn app.main:app --port 8001 &

# Start Celery worker
celery -A app.workers.celery_app worker --loglevel=info -Q celery,uat,audit --concurrency=2 &

# Node worker
cd ../workers/node-worker
npm install && npm install pino-pretty
npx playwright install chromium
npx tsx src/server.ts &

# Frontend
cd ../../frontend
npm install
BACKEND_URL=http://localhost:8001 npx next dev --port 3000
```

Visit `http://localhost:3000`.

## Setup

1. Register an account (first user = admin)
2. Go to **Admin > API Keys**
3. Select your AI provider (OpenAI, Anthropic, or Ollama)
4. Enter your API key and select a model
5. Click **Save API Keys**
6. Go to **Dashboard**, enter a URL, and click **Test Now**

## Architecture

```
frontend/          Next.js 15 (TypeScript, Tailwind CSS)
backend/           FastAPI (Python 3.12, SQLAlchemy, Celery)
workers/node-worker/  Fastify (TypeScript, Midscene.js, Playwright)
```

```
User -> Next.js -> FastAPI -> Celery Worker -> Browser Use (UAT)
                                            -> Node Worker -> Midscene.js (UI Audit)
                                            -> Node Worker -> Playwright (UX Audit)
```

**Database:** PostgreSQL 16
**Queue:** Redis 7 + Celery
**Browser:** Playwright Chromium (headless)

## Admin Features

- **Branding** — Colors, fonts, logo, favicon, custom CSS
- **SMTP** — Email configuration for notifications
- **API Keys** — OpenAI / Anthropic / Ollama with model selector
- **Users** — Create, edit, disable, role management (admin/tester)
- **Logs** — Test history with token usage and cost tracking
- **MCP Server** — Expose as MCP tools for Claude Desktop, Claude Code, Cursor

## MCP Integration

TestAgent exposes an MCP server so AI clients can trigger tests programmatically.

**Admin > MCP Server** to create a token, then add to your AI client config:

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "testagent": {
      "url": "http://your-server:8000/mcp/sse",
      "headers": {
        "Authorization": "Bearer mcp_your_token_here"
      }
    }
  }
}
```

**Available MCP tools:** `run_test`, `get_test_result`, `list_tests`, `get_stats`

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2, Pydantic v2 |
| Database | PostgreSQL 16 |
| Queue | Redis 7, Celery 5 |
| UAT Engine | Browser Use |
| UI Audit Engine | Midscene.js |
| UX Audit Engine | Playwright MCP |
| Browser | Playwright Chromium |
| Deploy | Docker Compose |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | (required) | JWT signing key |
| `DB_USER` | `testagent` | PostgreSQL user |
| `DB_PASS` | `testagent` | PostgreSQL password |
| `DB_NAME` | `testagent` | PostgreSQL database |
| `FRONTEND_PORT` | `3000` | Frontend port |
| `BACKEND_PORT` | `8000` | Backend port |
| `OPENAI_API_KEY` | (optional) | Can also set in admin panel |
| `ANTHROPIC_API_KEY` | (optional) | Can also set in admin panel |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |

## License

MIT
