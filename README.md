# CivicDesk

CivicDesk is a facilities service desk MVP built from the PRD dated June 16, 2026. It includes:

- A responsive Next.js dashboard for queue triage
- Work-order creation and detail views
- Assignment, status, and comment workflows with an activity log
- SLA-driven overdue detection and operational metrics
- A minimal MCP-compatible stdio server plus an HTTP tool bridge

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- File-backed JSON persistence for local development

## Run locally

1. Install dependencies: `npm install`
2. Start the web app: `npm run dev`
3. Start the MCP server: `npm run mcp`

## Supabase

The Supabase schema prep now lives in [supabase/migrations/20260616230000_initial_schema.sql](C:/Users/nmarc/Documents/GitHub/CivicDesk/supabase/migrations/20260616230000_initial_schema.sql), with seed data in [supabase/seed.sql](C:/Users/nmarc/Documents/GitHub/CivicDesk/supabase/seed.sql) and local CLI config in [supabase/config.toml](C:/Users/nmarc/Documents/GitHub/CivicDesk/supabase/config.toml).

To point the app at Supabase, copy [.env.example](C:/Users/nmarc/Documents/GitHub/CivicDesk/.env.example) to `.env.local` and set:

- `DATA_PROVIDER=supabase`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If those values are not present, the app safely falls back to the local JSON dataset.

Helpful commands:

- `npm run supabase:check`
- `npm run supabase:seed`

## HTTP endpoints

- `GET /api/work-orders`
- `POST /api/work-orders`
- `GET /api/work-orders/:id`
- `PATCH /api/work-orders/:id`
- `POST /api/work-orders/:id/comments`
- `GET /api/metrics`
- `GET /api/mcp`
- `POST /api/mcp`

## MCP tools

- `list_work_orders`
- `get_work_order`
- `create_work_order`
- `update_work_order`
- `add_comment`
- `get_metrics`

## Notes

- The PRD calls for Supabase auth and persistence. This implementation uses a local JSON store so the full workflow can run immediately in an empty workspace.
- The MCP server implements the core `initialize`, `tools/list`, and `tools/call` flow over stdio using JSON-RPC framing.
