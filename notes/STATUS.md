# CivicDesk Status

## What Is Implemented

### Product foundation

- Next.js App Router project scaffolded in TypeScript
- Tailwind CSS styling and responsive layout
- CivicDesk branding and core navigation
- Local development scripts for app, build, typecheck, MCP server, and Supabase utilities

### Work-order workflow

- Dashboard queue view for work orders
- Filter controls for status, priority, category, facility, and assignee
- New request form for creating work orders
- Individual work-order detail page
- Dispatcher actions for status, priority, and technician assignment
- Comment creation on work orders
- Activity log display for work-order history

### Domain and operations logic

- Shared domain types for facilities, technicians, work orders, comments, and activity
- SLA logic for overdue detection by priority
- Metrics calculation for:
  - mean time to resolution
  - backlog by category
  - backlog by priority
  - overdue count
  - technician load

### API and agent surface

- REST-style app routes for:
  - list and create work orders
  - fetch and update a single work order
  - add comments
  - fetch metrics
- MCP-style HTTP endpoint for tool invocation
- Minimal stdio MCP server implementation
- Tool support for:
  - `list_work_orders`
  - `get_work_order`
  - `create_work_order`
  - `update_work_order`
  - `add_comment`
  - `get_metrics`

### Supabase backend prep and integration

- Full Supabase schema migration
- Supabase seed SQL aligned to CivicDesk sample data
- Supabase config for local CLI usage
- Provider-based data layer with:
  - JSON-backed development mode
  - Supabase-backed mode
- Supabase server client wiring
- Supabase check and seed scripts
- Hosted Supabase connectivity verified
- Local Supabase Docker stack verified
- App switched to `DATA_PROVIDER=supabase`

## Current Verified State

- `npm run typecheck` passes
- `npm run build` passes
- `npm run supabase:check` reports:
  - 3 facilities
  - 3 technicians
  - 3 work orders

## What Is Left To Implement

### Authentication and authorization

- Replace service-role style server access with proper auth-aware request flows
- Implement Supabase-auth sign-in and sign-out UI
- Connect authenticated users to `profiles`
- Enforce role-based experience for Requester, Dispatcher, Technician, and Leadership in the app

### Data access hardening

- Move more app reads and writes onto authenticated Supabase sessions where appropriate
- Validate that RLS policies behave correctly for each role
- Add safer server actions or route handlers around privileged operations
- Generate and use canonical Supabase database types from the live schema

### Product depth from the PRD

- Dedicated leadership reporting view
- Mean-time-to-resolution by category visualization
- Technician workload reporting screen
- More explicit overdue and SLA management UX
- Better empty states, errors, and loading states

### MCP and backend maturity

- Connect MCP tools directly to role-aware production auth flows
- Expand MCP robustness with better structured responses and error handling
- Add documentation for local/hosted MCP setup with Supabase

### Quality and delivery

- Automated tests for data logic, routes, and critical UI flows
- End-to-end tests for Supabase-backed CRUD
- Deployment configuration for Vercel plus environment documentation
- Cleanup of development-only shortcuts and seed assumptions

## Recommended Next Step

Implement authentication and role-aware Supabase access first, because that unlocks the PRD's main non-functional requirement and makes the current backend integration production-shaped instead of development-shaped.
