# CivicDesk

> **For reviewers: start at [SUBMISSION.md](./SUBMISSION.md).** It indexes the four required submission components (Business Statement, Logical Structure, Technical Implementation Guide, Application Code) and explains how to validate the packet against Gemini regeneration.

CivicDesk is a facilities service desk MVP for city operations teams. It includes:

- A responsive Next.js dashboard for queue triage
- Work-order creation and detail views
- Assignment, status, and comment workflows with an activity log
- SLA-driven overdue detection and operational metrics
- A first-class **MCP (Model Context Protocol) surface** — both a stdio JSON-RPC server and an HTTP bridge — sharing the same domain code as the UI

## Stack

- Next.js 15 App Router
- TypeScript (strict)
- Tailwind CSS
- File-backed JSON persistence (zero-config demo) **or** Supabase Postgres (production-shaped)
- `@supabase/supabase-js`, `vitest`

## Run locally (demo mode)

```bash
npm install
npm run dev      # http://localhost:3000
npm run mcp      # stdio MCP server
npm test         # unit tests for sla / metrics / validators
```

No environment variables required — the app falls back to [data/db.json](./data/db.json).

## Run against Supabase

Copy [.env.example](./.env.example) to `.env.local` and set:

- `DATA_PROVIDER=supabase`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Then:

```bash
supabase db push          # applies supabase/migrations/*.sql
npm run supabase:seed
npm run supabase:check    # expect facilities=3, technicians=3, work_orders=3
npm run dev
```

## HTTP endpoints

- `GET    /api/work-orders`
- `POST   /api/work-orders`
- `GET    /api/work-orders/:id`
- `PATCH  /api/work-orders/:id`
- `POST   /api/work-orders/:id/comments`
- `GET    /api/metrics`
- `GET    /api/mcp`             — tool catalog
- `POST   /api/mcp`             — invoke a tool

## MCP tools

`list_work_orders`, `get_work_order`, `create_work_order`, `update_work_order`, `add_comment`, `get_metrics`

The stdio server implements `initialize`, `tools/list`, and `tools/call` over JSON-RPC with `Content-Length` framing. Both the stdio server and the HTTP bridge route through the same `invokeMcpTool` dispatcher in [lib/mcp.ts](./lib/mcp.ts), which delegates to the same store layer the UI uses.

## Submission packet

See [SUBMISSION.md](./SUBMISSION.md). The roadmap items not implemented in this MVP (Supabase Auth UI, role-aware UI enforcement, leadership reporting screen) are documented in [notes/](./notes/) and disclaimed in [BUSINESS_STATEMENT.md §7](./BUSINESS_STATEMENT.md).
