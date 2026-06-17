# CivicDesk — Logical Structure

This document is an architectural blueprint. It is structured so that an LLM agent can reconstruct the system from the descriptions, diagrams, and contracts below, in combination with `TECHNICAL_IMPLEMENTATION.md` and the application source.

## 1. System Context Diagram

```
                +-------------------------+
                |  Browser (Requester /   |
                |  Dispatcher / Tech /    |
                |  Leadership)            |
                +-----------+-------------+
                            | HTTPS (HTML, RSC)
                            v
+---------------------------+----------------------------+
|                Next.js App Router (server)             |
|                                                        |
|  app/page.tsx           app/new/page.tsx               |
|  app/work-orders/[id]   app/layout.tsx                 |
|                                                        |
|  app/api/work-orders/**           app/api/metrics      |
|  app/api/mcp  (HTTP MCP bridge)                        |
+---------------------------+----------------------------+
                            |
                            v  (lib/store.ts unified API)
            +---------------+----------------+
            |                                |
  DATA_PROVIDER=json              DATA_PROVIDER=supabase
            |                                |
            v                                v
   data/db.json                    Supabase Postgres
   (file-backed dev store)         (RLS + triggers + views)
                                            ^
                                            |
                                   scripts/mcp-server.ts
                                   (stdio MCP — same lib/store)
                                            ^
                                            |
                                   External LLM Agent
                                   (Claude / Gemini / custom)
```

## 2. Module Map

| Layer | Folder | Responsibility |
|---|---|---|
| Pages (UI) | `app/` | Server components for dashboard, intake form, detail view; thin client components for form interactivity. |
| API | `app/api/**` | Next.js route handlers for REST + HTTP MCP bridge. |
| Components | `components/` | Presentational + form components. No data access. |
| Domain | `lib/types.ts`, `lib/sla.ts`, `lib/metrics.ts`, `lib/view-models.ts`, `lib/validators.ts`, `lib/format.ts` | Pure functions, types, SLA rules, metric calculations. No I/O. |
| Persistence | `lib/store.ts`, `lib/store-json.ts`, `lib/store-supabase.ts`, `lib/supabase.ts`, `lib/env.ts` | Provider-selecting store façade; concrete JSON and Supabase implementations. |
| MCP | `lib/mcp.ts`, `app/api/mcp/route.ts`, `scripts/mcp-server.ts` | Tool catalog, HTTP bridge, stdio JSON-RPC server. |
| DB | `supabase/migrations/`, `supabase/seed.sql`, `supabase/config.toml` | Schema, seed data, local CLI config. |
| Scripts | `scripts/` | Supabase check, seed, env loader, MCP server. |

## 3. Layering Rules (Hard Invariants)

1. `components/**` MUST NOT import from `lib/store*` or `lib/supabase*`. They receive data via props only.
2. `app/**/page.tsx` (server components) ARE the only place that calls `lib/store.ts`.
3. `lib/store.ts` is the single entry point for persistence. UI and API layers never touch `store-json` or `store-supabase` directly.
4. `lib/metrics.ts`, `lib/sla.ts`, `lib/view-models.ts` are pure. No `fetch`, no `fs`, no `process.env`.
5. The MCP HTTP route (`app/api/mcp/route.ts`) and the stdio MCP server (`scripts/mcp-server.ts`) both route through `lib/mcp.ts → invokeMcpTool`. Tool semantics never diverge between transports.

## 4. End-to-End Data Flows

### 4.1 Create a work order (UI)

```
User fills form in NewWorkOrderForm (client component)
   |
   v  fetch POST /api/work-orders   body: { title, description, facilityId, category, priority, requesterName, assigneeId? }
app/api/work-orders/route.ts (POST)
   |  validates fields (validators.ts)
   v
lib/store.ts :: createWorkOrder
   |  branches on DATA_PROVIDER
   v
store-json :: createWorkOrderJson           OR   store-supabase :: createWorkOrderSupabase
   - generates id (wo-<n>)                       - INSERT INTO work_orders
   - generates timestamps                        - schema trigger sets status=Assigned
   - sets status=Assigned if assigneeId          - schema trigger inserts activity rows
   - appends "created" + "assigned" activity     - re-fetch hydrated row
   - writes db.json
   |
   v
WorkOrder returned to route handler -> JSON response (201)
   |
   v
Client redirects to /work-orders/{id}
```

### 4.2 Render the queue (Server Component)

```
GET /
app/page.tsx (Server Component)
  reads searchParams -> WorkOrderFilters
  Promise.all([
    getFacilities(),
    getTechnicians(),
    listWorkOrders(filters),
    getMetrics()
  ])
  view-models.decorateWorkOrders(workOrders, facilities, technicians)
    -> attaches facilityName, assigneeName, overdue (from sla.isOverdue)
  renders:
    FilterBar(facilities, technicians, currentFilters)
    StatCard x 4 (MTTR, overdue, total open backlog, top technician load)
    WorkOrderTable(decoratedWorkOrders)
```

### 4.3 Dispatcher updates a work order

```
WorkOrderActions (client) submits PATCH /api/work-orders/{id}
  body: { status?, priority?, assigneeId? | null }
route handler -> store.updateWorkOrder
  json path: mutates db.json, appends activity entries per field changed
  supabase path: UPDATE work_orders; BEFORE UPDATE trigger:
    - if status moves to Resolved -> set resolved_at = now() if null
    - if status moves to Closed   -> require resolved_at non-null
    - if assignee set on Open order -> auto-set status=Assigned
    AFTER UPDATE trigger: insert work_order_activity rows for each changed field
returns full hydrated WorkOrder -> client refreshes
```

### 4.4 Agent invokes a tool (HTTP MCP)

```
POST /api/mcp  body: { tool: "create_work_order", arguments: {...} }
route handler -> lib/mcp.invokeMcpTool(tool, args)
  validates required string args
  delegates to lib/store.*
returns { result } as JSON
```

### 4.5 Agent invokes a tool (stdio MCP)

```
External LLM client launches: npm run mcp
scripts/mcp-server.ts:
  reads JSON-RPC messages (Content-Length framing) from stdin
  on "initialize"   -> returns server info + capabilities.tools
  on "tools/list"   -> returns mcpTools[] from lib/mcp.ts
  on "tools/call"   -> invokeMcpTool(params.name, params.arguments)
                       wraps result in { content: [{ type: "text", text: JSON.stringify(result) }] }
writes JSON-RPC responses to stdout with Content-Length framing
```

## 5. Domain Model (ER Diagram)

```
profiles (1) ------< work_orders (created_by, requester_profile_id)
profiles (1) ------< technicians (profile_id, 0..1)
facilities (1) ----< work_orders (facility_id, required)
technicians (0..1) -< work_orders (assigned_technician_id)
work_orders (1) ---< work_order_comments
work_orders (1) ---< work_order_activity
priority_slas (1 per priority)   -- lookup table, joined logically by enum value
```

### Enumerations

- `app_role`            = { requester, dispatcher, technician, leadership }
- `work_order_category` = { HVAC, Plumbing, Electrical, Structural, Janitorial, Other }
- `work_order_priority` = { Low, Medium, High, Urgent }
- `work_order_status`   = { Open, Assigned, "In Progress", Resolved, Closed }
- `activity_type`       = { created, assigned, status_changed, priority_changed, comment_added }

### Core entity contracts (TypeScript-shaped)

```
Facility       = { id, name, address }
Technician     = { id, name, trade }
WorkOrder      = { id, title, description, facilityId, category, priority, status,
                   assigneeId | null, requesterName, createdAt, updatedAt,
                   resolvedAt | null, activity: ActivityEvent[], comments: WorkOrderComment[] }
ActivityEvent  = { id, type: ActivityType, message, createdAt }
WorkOrderComment = { id, author, message, createdAt }
Metrics        = { meanTimeToResolutionHours | null,
                   meanTimeToResolutionByCategory: Partial<Record<Category, number>>,
                   openBacklogByCategory: Partial<Record<Category, number>>,
                   openBacklogByPriority: Partial<Record<Priority, number>>,
                   overdueCount: number,
                   technicianLoad: { technicianId, technicianName, openCount }[] }
```

## 6. SLA / Business Rules

| Priority | SLA hours |
|---|---|
| Urgent | 4 |
| High | 24 |
| Medium | 72 |
| Low | 168 |

Rules (encoded in `lib/sla.ts` and mirrored in the Postgres `priority_slas` table + `work_order_queue` view):

- `isClosedStatus(s) = s in {Resolved, Closed}`
- `isOverdue(wo) = !isClosedStatus(wo.status) && elapsedHours(wo.createdAt, now) > slaHours(wo.priority)`
- Creating a work order with `assigneeId` set forces `status = Assigned`.
- Moving status to `Resolved` sets `resolvedAt = now()` if not already set.
- `Closed` is only reachable from `Resolved` (i.e., requires `resolvedAt`).
- Every mutation appends one or more rows to `work_order_activity` (or the in-memory `activity[]` for JSON mode).

## 7. Metric Definitions (executable spec for `calculateMetrics`)

```
resolved = workOrders where resolvedAt is not null
open     = workOrders where status not in {Resolved, Closed}

meanTimeToResolutionHours =
  null if resolved is empty
  else round1( mean( elapsedHours(o.createdAt, o.resolvedAt ?? o.updatedAt) for o in resolved ) )

meanTimeToResolutionByCategory[c] =
  defined only when resolved.filter(category=c) non-empty
  = round1(mean(elapsedHours over that subset))

openBacklogByCategory[c] = |open.filter(category=c)|   (omit zero entries)
openBacklogByPriority[p] = |open.filter(priority=p)|   (omit zero entries)
overdueCount             = |open.filter(isOverdue)|
technicianLoad           = for each technician: openCount = |open.filter(assigneeId == t.id)|
                           sorted by openCount desc, then by name asc
```

## 8. Provider Selection Logic

```
usingSupabase()
  = getDataProvider() == "supabase"
    AND hasSupabaseServerConfig()    // NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY both set

If true:  store-supabase.* is used.
If false: store-json.*     is used (db.json under data/).
```

This deliberate fallback means the app is *always* runnable from `npm install && npm run dev` with zero environment configuration.

## 9. REST API Contract Summary

| Method | Path | Body | Returns |
|---|---|---|---|
| GET    | /api/work-orders                       | – | WorkOrder[] |
| POST   | /api/work-orders                       | CreateWorkOrderInput | WorkOrder (201) |
| GET    | /api/work-orders/:id                   | – | WorkOrder \| 404 |
| PATCH  | /api/work-orders/:id                   | UpdateWorkOrderInput | WorkOrder |
| POST   | /api/work-orders/:id/comments          | AddCommentInput | WorkOrderComment (201) |
| GET    | /api/metrics                           | – | Metrics |
| GET    | /api/mcp                               | – | { tools: ToolDescriptor[] } |
| POST   | /api/mcp                               | { tool, arguments } | { result } |

All bodies are JSON. All errors return `{ error: string }` with an appropriate 4xx/5xx code.

## 10. MCP Tool Catalog

| Tool | Required args | Effect |
|---|---|---|
| `list_work_orders` | – | Optional filters {status, priority, facilityId, category, assigneeId}. Returns WorkOrder[]. |
| `get_work_order` | `id` | Returns hydrated WorkOrder or null. |
| `create_work_order` | `title, description, facilityId, category, priority, requesterName` (+ optional `assigneeId`) | Inserts; returns created WorkOrder. |
| `update_work_order` | `id` (+ any of status/priority/assigneeId) | Patches; returns updated WorkOrder. |
| `add_comment` | `workOrderId, author, message` | Appends comment; returns WorkOrderComment. |
| `get_metrics` | – | Returns the Metrics object. |

## 11. Non-Functional Requirements

- **No external runtime dependencies for demo mode.** `npm install && npm run dev` is sufficient.
- **Deterministic types.** `npm run typecheck` MUST pass with `strict: true`.
- **Routes are dynamic.** Server pages set `dynamic = "force-dynamic"` so stale data is never rendered.
- **Same-origin only.** No CORS configured; the MCP bridge assumes trusted callers.
- **Postgres row-level security** is enabled on every table in the Supabase schema, with policies aligned to `app_role`.

## 12. Worked Examples

All examples below resolve against the seeded dataset (`data/db.json` for JSON mode; the matching rows in `supabase/seed.sql` for Supabase mode). IDs are stable across providers. Time values are illustrative; the application stamps them with the server clock.

### 13.1 `POST /api/work-orders` — create an Urgent HVAC ticket with assignee

Request:

```json
{
  "title": "City Hall lobby AC blowing warm air",
  "description": "Air handler 2 lost cooling about 30 minutes ago. Lobby is at 28C.",
  "facilityId": "fac-city-hall",
  "category": "HVAC",
  "priority": "Urgent",
  "requesterName": "Lin Park",
  "assigneeId": "tech-1"
}
```

Response — `201 Created`:

```json
{
  "id": "wo-1004",
  "title": "City Hall lobby AC blowing warm air",
  "description": "Air handler 2 lost cooling about 30 minutes ago. Lobby is at 28C.",
  "facilityId": "fac-city-hall",
  "category": "HVAC",
  "priority": "Urgent",
  "status": "Assigned",
  "assigneeId": "tech-1",
  "requesterName": "Lin Park",
  "createdAt": "2026-06-17T15:02:11.412Z",
  "updatedAt": "2026-06-17T15:02:11.412Z",
  "resolvedAt": null,
  "activity": [
    { "id": "act-4001", "type": "created",  "message": "Work order created by Lin Park", "createdAt": "2026-06-17T15:02:11.412Z" },
    { "id": "act-4002", "type": "assigned", "message": "Assigned to Maya Chen",          "createdAt": "2026-06-17T15:02:11.412Z" }
  ],
  "comments": []
}
```

Key invariants demonstrated: server forced `status` to `"Assigned"` because `assigneeId` was provided at creation; two activity rows were written automatically (one `created`, one `assigned`).

### 13.2 `PATCH /api/work-orders/wo-1002` — resolve an in-progress order

Request:

```json
{ "status": "Resolved" }
```

Response — `200 OK` (truncated to highlight the deltas):

```json
{
  "id": "wo-1002",
  "status": "Resolved",
  "updatedAt": "2026-06-17T15:10:48.000Z",
  "resolvedAt": "2026-06-17T15:10:48.000Z",
  "activity": [
    { "id": "act-2001", "type": "created",        "message": "Work order created by Samira Ali",   "createdAt": "2026-06-16T12:10:00.000Z" },
    { "id": "act-2002", "type": "assigned",       "message": "Assigned to Andre Bouchard",         "createdAt": "2026-06-16T12:20:00.000Z" },
    { "id": "act-2003", "type": "status_changed", "message": "Status changed to In Progress",      "createdAt": "2026-06-16T13:00:00.000Z" },
    { "id": "act-2004", "type": "status_changed", "message": "Status changed to Resolved",         "createdAt": "2026-06-17T15:10:48.000Z" }
  ]
}
```

Invariants: `resolvedAt` was set automatically because the transition was into `Resolved`; a new `status_changed` activity event was appended.

### 13.3 `POST /api/work-orders/wo-1001/comments` — add a comment

Request:

```json
{ "author": "Maya Chen", "message": "Compressor contactor replaced. Monitoring overnight." }
```

Response — `201 Created`:

```json
{
  "id": "com-1002",
  "author": "Maya Chen",
  "message": "Compressor contactor replaced. Monitoring overnight.",
  "createdAt": "2026-06-17T15:22:03.000Z"
}
```

Side effect — a follow-up `GET /api/work-orders/wo-1001` shows the new `comment_added` activity row and a bumped `updatedAt`:

```json
{
  "activity": [
    { "id": "act-1001", "type": "created",       "message": "Work order created by Jordan Price",     "createdAt": "2026-06-14T13:15:00.000Z" },
    { "id": "act-1002", "type": "assigned",      "message": "Assigned to Maya Chen",                  "createdAt": "2026-06-15T08:30:00.000Z" },
    { "id": "act-1003", "type": "comment_added", "message": "Comment added by Maya Chen",             "createdAt": "2026-06-17T15:22:03.000Z" }
  ],
  "updatedAt": "2026-06-17T15:22:03.000Z"
}
```

### 13.4 `GET /api/metrics` — full Metrics response from the seeded dataset

```json
{
  "meanTimeToResolutionHours": 32.5,
  "meanTimeToResolutionByCategory": {
    "Plumbing": 32.5
  },
  "openBacklogByCategory": {
    "HVAC": 1,
    "Structural": 1
  },
  "openBacklogByPriority": {
    "High": 1,
    "Urgent": 1
  },
  "overdueCount": 2,
  "technicianLoad": [
    { "technicianId": "tech-2", "technicianName": "Andre Bouchard", "openCount": 1 },
    { "technicianId": "tech-1", "technicianName": "Maya Chen",      "openCount": 1 },
    { "technicianId": "tech-3", "technicianName": "Leila Singh",    "openCount": 0 }
  ]
}
```

Computed from the seeded `wo-1001` (HVAC / High / Assigned), `wo-1002` (Structural / Urgent / In Progress), and `wo-1003` (Plumbing / Medium / Resolved after 32.5h). `overdueCount` reflects both open orders being past their SLA when evaluated after their priority's window. `technicianLoad` is sorted by `openCount DESC`, then `name ASC`.

### 13.5 `GET /api/mcp` — tool catalog

```json
{
  "tools": [
    { "name": "list_work_orders",  "description": "List work orders with optional filters for status, priority, facility, category, and assignee.", "inputSchema": { "type": "object", "properties": { "status": { "type": "string" }, "priority": { "type": "string" }, "facilityId": { "type": "string" }, "category": { "type": "string" }, "assigneeId": { "type": "string" } } } },
    { "name": "get_work_order",    "description": "Get full details for a single work order by id.",                                                "inputSchema": { "type": "object", "required": ["id"], "properties": { "id": { "type": "string" } } } },
    { "name": "create_work_order", "description": "Create a new work order from structured fields.",                                                "inputSchema": { "type": "object", "required": ["title","description","facilityId","category","priority","requesterName"], "properties": { "title": { "type": "string" }, "description": { "type": "string" }, "facilityId": { "type": "string" }, "category": { "type": "string" }, "priority": { "type": "string" }, "requesterName": { "type": "string" }, "assigneeId": { "type": "string" } } } },
    { "name": "update_work_order", "description": "Change status, priority, or assignment for an existing work order.",                             "inputSchema": { "type": "object", "required": ["id"], "properties": { "id": { "type": "string" }, "status": { "type": "string" }, "priority": { "type": "string" }, "assigneeId": { "type": ["string","null"] } } } },
    { "name": "add_comment",       "description": "Append a comment to a work order.",                                                              "inputSchema": { "type": "object", "required": ["workOrderId","author","message"], "properties": { "workOrderId": { "type": "string" }, "author": { "type": "string" }, "message": { "type": "string" } } } },
    { "name": "get_metrics",       "description": "Return mean time to resolution, open backlog, overdue count, and technician load.",              "inputSchema": { "type": "object", "properties": {} } }
  ]
}
```

### 13.6 `POST /api/mcp` — invoke a tool over HTTP

Request:

```json
{
  "tool": "create_work_order",
  "arguments": {
    "title": "Library branch power flicker",
    "description": "Lights in stacks B and C briefly drop every 10-15 minutes.",
    "facilityId": "fac-main-library",
    "category": "Electrical",
    "priority": "High",
    "requesterName": "Devon Wu",
    "assigneeId": "tech-2"
  }
}
```

Response — `200 OK`:

```json
{
  "result": {
    "id": "wo-1005",
    "title": "Library branch power flicker",
    "status": "Assigned",
    "priority": "High",
    "assigneeId": "tech-2",
    "createdAt": "2026-06-17T15:31:12.000Z",
    "updatedAt": "2026-06-17T15:31:12.000Z",
    "resolvedAt": null,
    "activity": [
      { "id": "act-5001", "type": "created",  "message": "Work order created by Devon Wu", "createdAt": "2026-06-17T15:31:12.000Z" },
      { "id": "act-5002", "type": "assigned", "message": "Assigned to Andre Bouchard",     "createdAt": "2026-06-17T15:31:12.000Z" }
    ],
    "comments": []
  }
}
```

Error shape — on a validation failure the HTTP MCP route returns 400 with `{ "error": "title must be a non-empty string" }`.

### 13.7 stdio MCP — one full JSON-RPC `tools/call` frame

Request frame sent on stdin (literal bytes, `\r\n` line endings between header and body):

```
Content-Length: 172\r\n
\r\n
{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"get_metrics","arguments":{}}}
```

Response frame on stdout (body shortened for clarity — the real frame's `text` field contains a JSON-stringified `Metrics` object identical in shape to §13.4):

```
Content-Length: 411\r\n
\r\n
{"jsonrpc":"2.0","id":7,"result":{"content":[{"type":"text","text":"{\"meanTimeToResolutionHours\":32.5,\"openBacklogByCategory\":{\"HVAC\":1,\"Structural\":1},\"openBacklogByPriority\":{\"High\":1,\"Urgent\":1},\"overdueCount\":2,\"technicianLoad\":[{\"technicianId\":\"tech-2\",\"technicianName\":\"Andre Bouchard\",\"openCount\":1}]}"}]}}
```

Key contract: the stdio server wraps the same domain result returned by `lib/mcp.invokeMcpTool` inside `result.content[0].text` as a JSON-stringified payload. On a thrown tool error the response includes `"isError": true` alongside the `content` array.

---

## 13. Reproducibility Contract

A reader (human or LLM) given this document plus `TECHNICAL_IMPLEMENTATION.md` MUST be able to reproduce:

1. The folder layout and file responsibilities in §2.
2. The four end-to-end flows in §4 — byte-equivalent JSON contracts.
3. The metric formulas in §7.
4. The schema enums and table relationships in §5.
5. The provider-fallback rule in §8.

If any of these cannot be reproduced from the text, the documents — not the application — are at fault.
