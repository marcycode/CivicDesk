# CivicDesk — Business Statement

## 1. Problem

City facility teams (e.g., the Los Angeles Department of General Services) receive maintenance requests through fragmented channels — phone calls, emails, paper forms, walk-ins. As a result:

- **Requests get lost or duplicated.** There is no single queue of record.
- **Dispatchers triage by memory.** Priority and SLA expectations live in tribal knowledge, not the system.
- **Technicians lack a clean assignment surface.** Updates happen verbally; status drifts from reality.
- **Leadership has no live operational picture.** Mean-time-to-resolution, backlog by trade, and overdue counts are reconstructed manually in spreadsheets, days or weeks late.

The result is missed SLAs on urgent facility issues (HVAC outages, structural hazards, plumbing failures) that directly affect public-facing buildings — City Hall, libraries, recreation centres — and the residents who use them.

## 2. Program Description

**CivicDesk** is a lightweight, agent-ready facilities service desk. It provides:

- A single triage **queue** of work orders with filters by status, priority, category, facility, and assignee.
- A structured **intake form** for new requests (title, description, facility, category, priority, requester).
- A work-order **detail view** with dispatcher actions (status, priority, assignment), a comment thread, and an automatically maintained activity log.
- A **metrics surface** computing mean time to resolution (overall and by category), open backlog by category and priority, overdue count (driven by per-priority SLAs), and per-technician open load.
- A **REST API** mirroring every UI action, plus an **MCP (Model Context Protocol) tool surface** that exposes the same operations as JSON-RPC tools so that AI agents (Claude, Gemini, internal copilots) can read and act on the queue programmatically.

A configurable data layer runs the same UI against either a local JSON store (for zero-setup demos) or a hosted Supabase Postgres instance (for production-shaped persistence with row-level security and triggers).

## 3. Quantitative Business Value

| Lever | Mechanism | Estimated impact |
|---|---|---|
| **Reduced time-to-acknowledge** | Single intake form replaces phone/email triage | 60–80% reduction in time from request submission to assignment |
| **SLA visibility** | Per-priority SLA hours (Urgent = 4h, High = 24h, Medium = 72h, Low = 168h) compared to elapsed time on every open order | Overdue work orders surfaced in the queue and on the dashboard the moment they breach |
| **Mean time to resolution** | Computed in real time from `created_at` → `resolved_at` per order, aggregated overall and by category | Leadership sees MTTR drift the same day, not the next reporting cycle |
| **Dispatcher throughput** | Filterable queue + one-screen actions panel (status / priority / assignment) | Dispatchers triage 2–3× more work orders per hour than email-driven workflows |
| **Workforce balancing** | `technician_load` metric ranks technicians by open count | Even distribution of work; avoids hidden overload on senior staff |
| **Agent automation** | MCP tools (`list_work_orders`, `create_work_order`, `update_work_order`, `add_comment`, `get_metrics`) | Any LLM agent can intake email/SMS requests, draft updates, or run reports without screen scraping |

## 4. Qualitative Business Value

- **Single source of truth.** Every state change is captured in `work_order_activity` — fully auditable.
- **Role-shaped data model.** `app_role` enum (`requester`, `dispatcher`, `technician`, `leadership`) and RLS policies in the Supabase schema make the system safe to expose externally without leaking other departments' data.
- **Agent-native.** The MCP surface is not an afterthought; tool definitions and HTTP entry points are first-class. The same domain logic backs the UI, the REST API, and the agent tools — no drift.
- **Re-generatable from documentation.** This submission packet (Business Statement, Logical Structure, Technical Implementation Guide, Application Code) is structured so that an LLM can rebuild the application from the Markdown alone.

## 5. Target Users

| Role | What they do in CivicDesk |
|---|---|
| **Requester** (any city employee) | Submits a new work order via `/new`. |
| **Dispatcher** | Triages the queue at `/`. Assigns technicians, updates priority/status, comments on orders. |
| **Technician** | Picks up assigned work orders from the queue, comments status, marks "In Progress" → "Resolved". |
| **Leadership** | Reads the dashboard metrics: MTTR overall and by category, overdue count, backlog by category/priority, technician load. |
| **AI agent** | Reads and writes the same queue via MCP tools or HTTP, e.g. to intake emailed requests or generate weekly reports. |

## 6. Success Metrics

The application is successful when the following are true after a representative pilot period (e.g., one calendar quarter at one facility):

1. **Intake completeness ≥ 95%.** ≥95% of incoming requests captured through the form rather than ad-hoc channels.
2. **SLA breach rate ↓.** Overdue count (Urgent + High) trends down month over month.
3. **MTTR transparency.** Leadership reads MTTR from the dashboard without a follow-up data request.
4. **Agent assist.** At least one automated agent flow (e.g., email → `create_work_order`) is in production via the MCP surface.

## 7. Scope Boundaries

In scope for the MVP submitted here:

- Work-order intake, triage, assignment, comments, activity log, and metrics.
- JSON-file persistence (zero-config demo) and Supabase persistence (production-shaped) selected by `DATA_PROVIDER` env var.
- REST + MCP surface for every domain operation.
- Postgres schema with enums, triggers, views, and RLS policies for role-aware access.

Explicitly out of scope for the MVP (called out so the reviewer knows what is intentional):

- End-user Supabase Auth UI (sign-in / sign-out flows). The Supabase schema supports it via `profiles` and `app_role`; the UI layer assumes a single trusted operator for now.
- File attachments on work orders.
- Push notifications / email alerts.
- Mobile-native technician app (the responsive web UI covers the MVP).
