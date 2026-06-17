# CivicDesk — Technical Implementation Guide

This document is the **algorithmic blueprint** for re-generating CivicDesk from documentation alone. It pairs with `BUSINESS_STATEMENT.md` (the "why") and `LOGICAL_STRUCTURE.md` (the "what"). Each step here is intentionally explicit enough to feed into an LLM (e.g., Gemini) to reconstruct the application end-to-end.

The instructions are ordered so that each step depends only on prior steps.

---

## Step 0 — Project Bootstrap

1. Create a Next.js 15 App-Router project with TypeScript and Tailwind:
   - `package.json` `name = "civicdesk"`, `type = "module"`.
   - Dependencies: `next@15.3.3`, `react@19.1.0`, `react-dom@19.1.0`, `@supabase/supabase-js@^2.108.2`.
   - Dev deps: `typescript@5.8.3`, `tsx@4.19.4`, `tailwindcss@3.4.17`, `postcss@8.5.3`, `autoprefixer@10.4.20`, `@types/node@22.15.30`, `@types/react@19.1.8`, `@types/react-dom@19.1.6`, `supabase@^2.106.0`.
   - Scripts:
     ```json
     {
       "dev": "next dev",
       "build": "next build",
       "start": "next start",
       "typecheck": "tsc --noEmit",
       "mcp": "tsx scripts/mcp-server.ts",
       "supabase:check": "tsx scripts/check-supabase.ts",
       "supabase:seed": "tsx scripts/seed-supabase.ts"
     }
     ```
2. `tsconfig.json`: `target=ES2022`, `module=ESNext`, `moduleResolution=Bundler`, `jsx=preserve`, `strict=true`, `resolveJsonModule=true`, `incremental=true`, paths `"@/*": ["./"]`.
3. `next.config.ts`: enable `experimental.typedRoutes = true`.
4. `tailwind.config.ts` `content`: `["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"]`. Extend the theme with civic colors: `ink #1f2937`, `sand #f6f1e8`, `clay #d7c7a9`, `pine #1f4d3a`, `rust #a14a2a`, `gold #d2a855`. Add `boxShadow.card = "0 20px 60px rgba(31, 41, 55, 0.08)"`.
5. `postcss.config.mjs`: standard Tailwind/Autoprefixer pipeline.
6. `app/globals.css`: Tailwind base/components/utilities; body uses `bg-sand text-ink antialiased`.

---

## Step 1 — Domain Types and Pure Logic (`lib/`)

Create the following files. All are pure; no I/O, no env, no fetch.

### `lib/types.ts`

Export constants and types per `LOGICAL_STRUCTURE.md §5`:

```ts
export const categories  = ["HVAC","Plumbing","Electrical","Structural","Janitorial","Other"] as const;
export const priorities  = ["Low","Medium","High","Urgent"] as const;
export const statuses    = ["Open","Assigned","In Progress","Resolved","Closed"] as const;

export type Category = typeof categories[number];
export type Priority = typeof priorities[number];
export type Status   = typeof statuses[number];

export type ActivityEvent     = { id; type: "created"|"assigned"|"status_changed"|"priority_changed"|"comment_added"; message; createdAt };
export type WorkOrderComment  = { id; author; message; createdAt };
export type Facility          = { id; name; address };
export type Technician        = { id; name; trade };
export type WorkOrder         = { id; title; description; facilityId; category; priority; status;
                                  assigneeId: string|null; requesterName; createdAt; updatedAt;
                                  resolvedAt: string|null; activity: ActivityEvent[]; comments: WorkOrderComment[] };
export type WorkOrderFilters  = { status?; priority?; facilityId?; category?; assigneeId? };
export type DatabaseShape     = { facilities: Facility[]; technicians: Technician[]; workOrders: WorkOrder[] };
export type Metrics           = { meanTimeToResolutionHours: number|null;
                                  meanTimeToResolutionByCategory: Partial<Record<Category, number>>;
                                  openBacklogByCategory: Partial<Record<Category, number>>;
                                  openBacklogByPriority: Partial<Record<Priority, number>>;
                                  overdueCount: number;
                                  technicianLoad: { technicianId; technicianName; openCount: number }[] };
```

### `lib/sla.ts`

```
hoursByPriority = { Low:168, Medium:72, High:24, Urgent:4 }
getSlaHours(p)          -> hoursByPriority[p]
getElapsedHours(a,b?)   -> (Date(b ?? now) - Date(a)) / 3_600_000
isClosedStatus(s)       -> s in {Resolved, Closed}
isOverdue(wo, now?)     -> !isClosedStatus(wo.status) && getElapsedHours(wo.createdAt, now) > getSlaHours(wo.priority)
```

### `lib/metrics.ts`

Implement `calculateMetrics(workOrders, technicians)` exactly per `LOGICAL_STRUCTURE.md §7`. Round MTTRs to one decimal. Omit zero entries from backlog maps. Sort `technicianLoad` by `openCount DESC` then `name ASC`.

### `lib/format.ts`

```
formatDateTime(value) -> Intl.DateTimeFormat("en-CA",{dateStyle:"medium", timeStyle:"short"}).format(new Date(value))
formatHours(value)    -> value==null ? "N/A" : `${value.toFixed(1)}h`
```

### `lib/validators.ts`

```
asStatus(s?)   -> Status   | undefined         (membership check against statuses)
asPriority(s?) -> Priority | undefined
asCategory(s?) -> Category | undefined
toWorkOrderFilters(input) -> WorkOrderFilters  (whitelists keys, runs as* coercions)
```

### `lib/view-models.ts`

```
DecoratedWorkOrder = WorkOrder & { facilityName: string; assigneeName: string|null; overdue: boolean }
decorateWorkOrder(o, facilities, technicians)
decorateWorkOrders(list, facilities, technicians)
```

`facilityName = facilities.find(f=>f.id===o.facilityId)?.name ?? "Unknown"`. `assigneeName = technicians.find(t=>t.id===o.assigneeId)?.name ?? null`. `overdue = isOverdue(o)`.

---

## Step 2 — Environment + Provider Switch

### `lib/env.ts`

```
getDataProvider()       -> process.env.DATA_PROVIDER === "supabase" ? "supabase" : "json"
hasSupabaseServerConfig() -> Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
```

### `lib/supabase.ts`

Singleton:

```
getSupabaseServerClient(): SupabaseClient<Database>
  - throws if NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing
  - createClient(url, serviceRoleKey, { auth: { persistSession: false } })
```

### `.env.example`

```
DATA_PROVIDER=json
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Step 3 — JSON Persistence (`lib/store-json.ts` + `data/db.json`)

1. `data/db.json` initial content has shape `DatabaseShape` with 3 facilities, 3 technicians, 3 sample work orders mirroring `supabase/seed.sql` (see Step 7).
2. Implementation:
   - `readDatabase()` synchronously reads `data/db.json` (use `fs/promises` for write).
   - `writeDatabase(db)` serializes with two-space indentation and trailing newline.
   - `nextId(prefix, list)` returns `${prefix}-${1000 + list.length + 1}` style ids.
   - CRUD helpers operate on a clone of the in-memory DB, then persist.
   - On `createWorkOrderJson`: timestamps via `new Date().toISOString()`; if `assigneeId` supplied force `status = "Assigned"` else `"Open"`; emit `created` activity, and `assigned` activity if applicable.
   - On `updateWorkOrderJson`: diff old → new; for each changed field push an activity event with `type` in `{status_changed, priority_changed, assigned}`; if new status is `Resolved` and `resolvedAt` is null, set it to now; reject `Closed` if `resolvedAt` is null.
   - On `addCommentJson`: append comment, append `comment_added` activity, bump `updatedAt`.

Export `CreateWorkOrderInput`, `UpdateWorkOrderInput`, `AddCommentInput` types matching the API contract in `LOGICAL_STRUCTURE.md §9`.

---

## Step 4 — Supabase Persistence (`lib/store-supabase.ts` + `lib/supabase-types.ts`)

1. `lib/supabase-types.ts`: minimal `Database` type stub describing the tables/columns from Step 7. (Hand-written or generated via `supabase gen types typescript`.)
2. `lib/store-supabase.ts` implements the same exports as `store-json.ts` but against Supabase:
   - `getFacilitiesSupabase`: `from('facilities').select('id,name,address').order('name')`.
   - `getTechniciansSupabase`: `from('technicians').select('id,name,trade').eq('active', true).order('name')`.
   - `listWorkOrdersSupabase(filters)`: query `work_orders` with `.eq()` per filter, `.order('created_at', { ascending: false })`. Hydrate each row's `activity[]` and `comments[]` via separate queries (`from('work_order_activity')` ordered by `created_at`, `from('work_order_comments')` ordered by `created_at`).
   - `getWorkOrderSupabase(id)`: `.eq('id', id).maybeSingle()`; hydrate as above.
   - `createWorkOrderSupabase(input)`: `INSERT` into `work_orders` mapping camelCase → snake_case. The schema triggers (Step 7) auto-set status when assignee provided and auto-insert `created` + `assigned` activity rows. Re-fetch the hydrated row.
   - `updateWorkOrderSupabase(id, updates)`: `UPDATE` with provided snake_case fields. Schema triggers manage `resolved_at` and activity. Re-fetch.
   - `addCommentSupabase(workOrderId, input)`: `INSERT` into `work_order_comments`. Schema trigger writes `comment_added` activity and bumps `work_orders.updated_at`.
   - `getMetricsSupabase()`: read all work orders + technicians, delegate to `calculateMetrics`. (The `metrics_overview` view in Step 7 is provided for direct SQL consumers.)
3. Row → camelCase mapping: write a small `mapWorkOrderRow(row, activity, comments)` helper.

---

## Step 5 — Store Façade (`lib/store.ts`)

A single switch:

```ts
function usingSupabase() {
  return getDataProvider() === "supabase" && hasSupabaseServerConfig();
}
```

Export `getFacilities, getTechnicians, listWorkOrders, getWorkOrder, createWorkOrder, updateWorkOrder, addComment, getMetrics`. Each is a thin function that delegates to the Supabase variant if `usingSupabase()`, else the JSON variant. **No other module imports `store-json` or `store-supabase` directly.**

---

## Step 6 — MCP Layer

### `lib/mcp.ts`

1. Export `mcpTools` — an array of six tool descriptors (name, description, JSON-schema `inputSchema`) matching `LOGICAL_STRUCTURE.md §10`.
2. Export `invokeMcpTool(name, args)`:
   - `list_work_orders` → `listWorkOrders({...})` after running `asStatus / asPriority / asCategory` and string coercion.
   - `get_work_order` → `getWorkOrder(args.id)`.
   - `create_work_order` → `createWorkOrder({...})`; reject missing required strings.
   - `update_work_order` → `updateWorkOrder(args.id, {...})`. Treat `assigneeId === null` as explicit unassign.
   - `add_comment` → `addComment(args.workOrderId, { author, message })`.
   - `get_metrics` → `getMetrics()`.
   - Default → `throw new Error("Unknown MCP tool: " + name)`.

### `app/api/mcp/route.ts`

- `GET` returns `{ tools: mcpTools }`.
- `POST` parses `{ tool, arguments }`, calls `invokeMcpTool`, returns `{ result }`. 400 on errors.

### `scripts/mcp-server.ts`

A minimal stdio MCP server:

- Read `Content-Length: N\r\n\r\n<json>` frames from `process.stdin`.
- Maintain a buffer; whenever a full frame is available, parse the JSON-RPC message.
- Respond to:
  - `initialize` → `{ protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "civicdesk-mcp", version: "0.1.0" } }`
  - `tools/list` → `{ tools: mcpTools }`
  - `tools/call` with `params = { name, arguments }` → `{ content: [{ type: "text", text: JSON.stringify(await invokeMcpTool(name, arguments)) }] }`. On thrown error: `{ content: [...], isError: true }`.
- Write responses to stdout using the same `Content-Length` framing.
- Load env from `.env.local` via `scripts/env-loader.ts` before any store call so Supabase mode is honored.

### `scripts/env-loader.ts`

Synchronously read `.env.local` (if present) and copy missing keys into `process.env`. Ignore lines starting with `#`.

---

## Step 7 — Supabase Schema (`supabase/migrations/20260616230000_initial_schema.sql`)

The migration below is the **canonical schema**. An agent regenerating CivicDesk MUST reproduce this file byte-for-byte at `supabase/migrations/20260616230000_initial_schema.sql`. The prose summary that follows is for human reviewers only — when the prose and the SQL disagree, the SQL wins.

**Summary of the migration's responsibilities** (so a reader does not need to read 580 lines before understanding the system):

- Declare 5 enums (`app_role`, `work_order_category`, `work_order_priority`, `work_order_status`, `activity_type`) and 7 tables (`profiles`, `facilities`, `technicians`, `work_orders`, `work_order_comments`, `work_order_activity`, `priority_slas`).
- Seed `priority_slas` with `(Urgent,4), (High,24), (Medium,72), (Low,168)`.
- Define `set_updated_at()` as a generic BEFORE-UPDATE trigger function on every timestamped table.
- Define helper functions `current_app_role()`, `is_dispatcher_or_leadership()`, `is_technician()` for use in RLS policies.
- Define `handle_work_order_mutations()` (BEFORE INSERT/UPDATE on `work_orders`) — auto-promotes `Open → Assigned` when an assignee is set, manages `resolved_at` / `closed_at` consistency, and inserts `status_changed` / `priority_changed` / `assigned` activity rows on UPDATE.
- Define `log_work_order_created()` (AFTER INSERT on `work_orders`) — inserts a `created` activity row, plus an `assigned` row if an assignee is present at creation time.
- Define `log_comment_created()` (AFTER INSERT on `work_order_comments`) — inserts a `comment_added` activity row and bumps `work_orders.updated_at`.
- Wire triggers, create indexes on the work-order hot path (status, priority, facility, category, assignee, created_at) and on the comment / activity foreign keys.
- Create three reporting views (`work_order_queue`, `metrics_overview`, `metrics_mean_time_by_category`, `metrics_technician_load`).
- Enable Row Level Security on every table and install policies that:
  - allow all authenticated users to read facilities, technicians, profiles, and SLAs,
  - allow dispatchers / leadership to fully manage every operational table,
  - allow requesters to see and create their own work orders,
  - allow technicians to see and update work orders assigned to them,
  - scope comment / activity visibility through the parent work order's visibility rule.

### Canonical SQL — copy verbatim

```sql
create extension if not exists pgcrypto;

create type public.app_role as enum ('requester', 'dispatcher', 'technician', 'leadership');
create type public.work_order_category as enum ('HVAC', 'Plumbing', 'Electrical', 'Structural', 'Janitorial', 'Other');
create type public.work_order_priority as enum ('Low', 'Medium', 'High', 'Urgent');
create type public.work_order_status as enum ('Open', 'Assigned', 'In Progress', 'Resolved', 'Closed');
create type public.activity_type as enum ('created', 'assigned', 'status_changed', 'priority_changed', 'comment_added');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'requester',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.technicians (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  name text not null,
  trade public.work_order_category not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint technician_trade_not_other check (trade <> 'Other')
);

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  requester_name text not null,
  requester_profile_id uuid references public.profiles (id) on delete set null,
  facility_id uuid not null references public.facilities (id) on delete restrict,
  category public.work_order_category not null,
  priority public.work_order_priority not null default 'Medium',
  status public.work_order_status not null default 'Open',
  assigned_technician_id uuid references public.technicians (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint work_order_title_length check (char_length(title) between 3 and 200),
  constraint work_order_description_length check (char_length(description) between 10 and 5000),
  constraint work_order_closed_requires_resolved check (closed_at is null or resolved_at is not null)
);

create table public.work_order_comments (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  author_profile_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  message text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint work_order_comment_message_length check (char_length(message) between 1 and 5000)
);

create table public.work_order_activity (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  event_type public.activity_type not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.priority_slas (
  priority public.work_order_priority primary key,
  target_hours integer not null check (target_hours > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.priority_slas (priority, target_hours)
values
  ('Urgent', 4),
  ('High', 24),
  ('Medium', 72),
  ('Low', 168)
on conflict (priority) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_dispatcher_or_leadership()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_app_role() in ('dispatcher', 'leadership'), false)
$$;

create or replace function public.is_technician()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_app_role() = 'technician', false)
$$;

create or replace function public.handle_work_order_mutations()
returns trigger
language plpgsql
as $$
declare
  assignee_name text;
begin
  if tg_op = 'INSERT' then
    if new.assigned_technician_id is not null and new.status = 'Open' then
      new.status = 'Assigned';
    end if;

    if new.status in ('Resolved', 'Closed') and new.resolved_at is null then
      new.resolved_at = timezone('utc', now());
    end if;

    if new.status = 'Closed' and new.closed_at is null then
      new.closed_at = coalesce(new.resolved_at, timezone('utc', now()));
    end if;

    return new;
  end if;

  if new.status in ('Resolved', 'Closed') and old.status not in ('Resolved', 'Closed') and new.resolved_at is null then
    new.resolved_at = timezone('utc', now());
  end if;

  if new.status not in ('Resolved', 'Closed') then
    new.closed_at = null;
    if old.status in ('Resolved', 'Closed') then
      new.resolved_at = null;
    end if;
  end if;

  if new.status = 'Closed' and new.closed_at is null then
    new.closed_at = coalesce(new.resolved_at, timezone('utc', now()));
  end if;

  if new.assigned_technician_id is not null and old.assigned_technician_id is distinct from new.assigned_technician_id and new.status = 'Open' then
    new.status = 'Assigned';
  end if;

  if old.status is distinct from new.status then
    insert into public.work_order_activity (work_order_id, actor_profile_id, event_type, message, metadata)
    values (
      new.id,
      auth.uid(),
      'status_changed',
      format('Status changed to %s', new.status),
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;

  if old.priority is distinct from new.priority then
    insert into public.work_order_activity (work_order_id, actor_profile_id, event_type, message, metadata)
    values (
      new.id,
      auth.uid(),
      'priority_changed',
      format('Priority changed to %s', new.priority),
      jsonb_build_object('from', old.priority, 'to', new.priority)
    );
  end if;

  if old.assigned_technician_id is distinct from new.assigned_technician_id then
    if new.assigned_technician_id is null then
      insert into public.work_order_activity (work_order_id, actor_profile_id, event_type, message, metadata)
      values (
        new.id,
        auth.uid(),
        'assigned',
        'Assignment cleared',
        jsonb_build_object('from', old.assigned_technician_id, 'to', null)
      );
    else
      select name into assignee_name
      from public.technicians
      where id = new.assigned_technician_id;

      insert into public.work_order_activity (work_order_id, actor_profile_id, event_type, message, metadata)
      values (
        new.id,
        auth.uid(),
        'assigned',
        format('Assigned to %s', coalesce(assignee_name, 'technician')),
        jsonb_build_object('from', old.assigned_technician_id, 'to', new.assigned_technician_id)
      );
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.log_work_order_created()
returns trigger
language plpgsql
as $$
begin
  insert into public.work_order_activity (work_order_id, actor_profile_id, event_type, message)
  values (new.id, auth.uid(), 'created', format('Work order created by %s', new.requester_name));

  if new.assigned_technician_id is not null then
    insert into public.work_order_activity (work_order_id, actor_profile_id, event_type, message, metadata)
    select
      new.id,
      auth.uid(),
      'assigned',
      format('Assigned to %s', t.name),
      jsonb_build_object('to', t.id)
    from public.technicians t
    where t.id = new.assigned_technician_id;
  end if;

  return new;
end;
$$;

create or replace function public.log_comment_created()
returns trigger
language plpgsql
as $$
begin
  insert into public.work_order_activity (work_order_id, actor_profile_id, event_type, message, metadata)
  values (
    new.work_order_id,
    auth.uid(),
    'comment_added',
    format('Comment added by %s', new.author_name),
    jsonb_build_object('comment_id', new.id)
  );

  update public.work_orders
  set updated_at = timezone('utc', now())
  where id = new.work_order_id;

  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_facilities_updated_at
before update on public.facilities
for each row
execute function public.set_updated_at();

create trigger set_technicians_updated_at
before update on public.technicians
for each row
execute function public.set_updated_at();

create trigger set_work_orders_updated_at
before update on public.work_orders
for each row
execute function public.set_updated_at();

create trigger set_priority_slas_updated_at
before update on public.priority_slas
for each row
execute function public.set_updated_at();

create trigger work_order_mutations_before_write
before insert or update on public.work_orders
for each row
execute function public.handle_work_order_mutations();

create trigger work_order_created_after_insert
after insert on public.work_orders
for each row
execute function public.log_work_order_created();

create trigger work_order_comment_created_after_insert
after insert on public.work_order_comments
for each row
execute function public.log_comment_created();

create index work_orders_status_idx on public.work_orders (status);
create index work_orders_priority_idx on public.work_orders (priority);
create index work_orders_facility_idx on public.work_orders (facility_id);
create index work_orders_category_idx on public.work_orders (category);
create index work_orders_assignee_idx on public.work_orders (assigned_technician_id);
create index work_orders_created_at_idx on public.work_orders (created_at desc);
create index work_order_comments_work_order_idx on public.work_order_comments (work_order_id, created_at desc);
create index work_order_activity_work_order_idx on public.work_order_activity (work_order_id, created_at desc);

create or replace view public.work_order_queue as
select
  wo.id,
  wo.title,
  wo.description,
  wo.requester_name,
  wo.facility_id,
  f.name as facility_name,
  wo.category,
  wo.priority,
  wo.status,
  wo.assigned_technician_id,
  t.name as assignee_name,
  wo.resolved_at,
  wo.created_at,
  wo.updated_at,
  sla.target_hours,
  (
    wo.status not in ('Resolved', 'Closed')
    and timezone('utc', now()) > wo.created_at + make_interval(hours => sla.target_hours)
  ) as is_overdue
from public.work_orders wo
join public.facilities f on f.id = wo.facility_id
left join public.technicians t on t.id = wo.assigned_technician_id
join public.priority_slas sla on sla.priority = wo.priority;

create or replace view public.metrics_overview as
with resolved as (
  select
    category,
    extract(epoch from (resolved_at - created_at)) / 3600.0 as resolution_hours
  from public.work_orders
  where resolved_at is not null
),
open_orders as (
  select *
  from public.work_orders
  where status not in ('Resolved', 'Closed')
)
select
  (
    select round(avg(resolution_hours)::numeric, 1)
    from resolved
  ) as mean_time_to_resolution_hours,
  (
    select count(*)
    from public.work_order_queue
    where is_overdue
  ) as overdue_count,
  (
    select coalesce(
      jsonb_object_agg(category, count_value),
      '{}'::jsonb
    )
    from (
      select category::text as category, count(*)::int as count_value
      from open_orders
      group by category
    ) by_category
  ) as open_backlog_by_category,
  (
    select coalesce(
      jsonb_object_agg(priority, count_value),
      '{}'::jsonb
    )
    from (
      select priority::text as priority, count(*)::int as count_value
      from open_orders
      group by priority
    ) by_priority
  ) as open_backlog_by_priority;

create or replace view public.metrics_mean_time_by_category as
select
  category,
  round(avg(extract(epoch from (resolved_at - created_at)) / 3600.0)::numeric, 1) as mean_resolution_hours
from public.work_orders
where resolved_at is not null
group by category;

create or replace view public.metrics_technician_load as
select
  t.id as technician_id,
  t.name as technician_name,
  count(wo.id)::int as open_count
from public.technicians t
left join public.work_orders wo
  on wo.assigned_technician_id = t.id
  and wo.status not in ('Resolved', 'Closed')
group by t.id, t.name
order by open_count desc, technician_name asc;

alter table public.profiles enable row level security;
alter table public.facilities enable row level security;
alter table public.technicians enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_comments enable row level security;
alter table public.work_order_activity enable row level security;
alter table public.priority_slas enable row level security;

create policy "profiles are readable by authenticated users"
on public.profiles
for select
to authenticated
using (true);

create policy "users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "dispatcher manages profiles"
on public.profiles
for all
to authenticated
using (public.is_dispatcher_or_leadership())
with check (public.is_dispatcher_or_leadership());

create policy "authenticated users can read facilities"
on public.facilities
for select
to authenticated
using (true);

create policy "dispatchers manage facilities"
on public.facilities
for all
to authenticated
using (public.is_dispatcher_or_leadership())
with check (public.is_dispatcher_or_leadership());

create policy "authenticated users can read technicians"
on public.technicians
for select
to authenticated
using (true);

create policy "dispatchers manage technicians"
on public.technicians
for all
to authenticated
using (public.is_dispatcher_or_leadership())
with check (public.is_dispatcher_or_leadership());

create policy "authenticated users can read work orders"
on public.work_orders
for select
to authenticated
using (
  public.is_dispatcher_or_leadership()
  or requester_profile_id = auth.uid()
  or created_by = auth.uid()
  or assigned_technician_id in (
    select id from public.technicians where profile_id = auth.uid()
  )
);

create policy "requesters can create work orders"
on public.work_orders
for insert
to authenticated
with check (
  requester_profile_id = auth.uid()
  or created_by = auth.uid()
  or public.is_dispatcher_or_leadership()
);

create policy "dispatchers manage work orders"
on public.work_orders
for update
to authenticated
using (public.is_dispatcher_or_leadership())
with check (public.is_dispatcher_or_leadership());

create policy "technicians can update assigned work orders"
on public.work_orders
for update
to authenticated
using (
  assigned_technician_id in (
    select id from public.technicians where profile_id = auth.uid()
  )
)
with check (
  assigned_technician_id in (
    select id from public.technicians where profile_id = auth.uid()
  )
);

create policy "authenticated users can read comments"
on public.work_order_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.work_orders wo
    where wo.id = work_order_id
      and (
        public.is_dispatcher_or_leadership()
        or wo.requester_profile_id = auth.uid()
        or wo.created_by = auth.uid()
        or wo.assigned_technician_id in (
          select id from public.technicians where profile_id = auth.uid()
        )
      )
  )
);

create policy "authenticated users can add comments to visible work orders"
on public.work_order_comments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.work_orders wo
    where wo.id = work_order_id
      and (
        public.is_dispatcher_or_leadership()
        or wo.requester_profile_id = auth.uid()
        or wo.created_by = auth.uid()
        or wo.assigned_technician_id in (
          select id from public.technicians where profile_id = auth.uid()
        )
      )
  )
);

create policy "authenticated users can read activity"
on public.work_order_activity
for select
to authenticated
using (
  exists (
    select 1
    from public.work_orders wo
    where wo.id = work_order_id
      and (
        public.is_dispatcher_or_leadership()
        or wo.requester_profile_id = auth.uid()
        or wo.created_by = auth.uid()
        or wo.assigned_technician_id in (
          select id from public.technicians where profile_id = auth.uid()
        )
      )
  )
);

create policy "authenticated users can read slas"
on public.priority_slas
for select
to authenticated
using (true);

create policy "dispatchers manage slas"
on public.priority_slas
for all
to authenticated
using (public.is_dispatcher_or_leadership())
with check (public.is_dispatcher_or_leadership());
```

### `supabase/seed.sql`

Inserts the 3 facilities, 3 technicians, and 3 work orders from §7 of `LOGICAL_STRUCTURE.md` plus matching activity (8 rows) and comments (2 rows). IDs are stable UUIDs so the JSON store mirror (`data/db.json`) and Supabase agree.

### `supabase/config.toml`

Default `supabase init` output with `project_id = "civicdesk"`.

---

## Step 8 — UI Components (`components/`)

All components are framework-agnostic (server-renderable). Forms use `"use client"`.

### Server components — behavioral summary

| File | Behavior |
|---|---|
| `StatCard.tsx` | Props `{ label, value, accent }`. Renders a card with a colored 2px top accent bar and large value text. |
| `StatusBadge.tsx` | Props `{ value, kind? }`. Color map: Urgent/Overdue → `bg-rose-100 text-rose-700`; High / In Progress → `amber`; Assigned → `sky`; Resolved/Closed → `emerald`; otherwise `stone`. |
| `FilterBar.tsx` | Props `{ facilities, technicians, currentFilters }`. Renders a `<form method="get">` with selects for status, priority, category, facility, assignee. Apply button submits; Clear is an `<a href="/">`. |
| `WorkOrderTable.tsx` | Props `{ workOrders: DecoratedWorkOrder[] }`. 7-column table; each row is a link to `/work-orders/{id}`. Shows an `Overdue` `StatusBadge` next to status when `overdue`. |

### Client components — canonical source

The three form components below carry behavior (controlled state, fetch wiring, redirect / refresh semantics, error and submitting states). An agent regenerating CivicDesk MUST reproduce each at the listed path. The Tailwind utility classes are part of the contract — the design depends on them.

#### File: `components/NewWorkOrderForm.tsx` — canonical source

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { categories, priorities, type Facility, type Technician } from "@/lib/types";

export function NewWorkOrderForm({
  facilities,
  technicians
}: {
  facilities: Facility[];
  technicians: Technician[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      requesterName: String(formData.get("requesterName") ?? ""),
      facilityId: String(formData.get("facilityId") ?? ""),
      category: String(formData.get("category") ?? ""),
      priority: String(formData.get("priority") ?? ""),
      assigneeId: String(formData.get("assigneeId") ?? "") || undefined
    };

    const response = await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to create work order");
      setSubmitting(false);
      return;
    }

    const created = (await response.json()) as { id: string };
    router.push(`/work-orders/${created.id}`);
    router.refresh();
  }

  return (
    <form className="grid gap-5 rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-card" onSubmit={handleSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Title" name="title" required />
        <Field label="Requester" name="requesterName" required />
      </div>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Description
        <textarea
          className="min-h-36 rounded-[1.5rem] border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-pine"
          name="description"
          required
        />
      </label>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SelectField
          label="Facility"
          name="facilityId"
          options={facilities.map((facility) => ({ value: facility.id, label: facility.name }))}
          required
        />
        <SelectField label="Category" name="category" options={categories.map((value) => ({ value, label: value }))} required />
        <SelectField label="Priority" name="priority" options={priorities.map((value) => ({ value, label: value }))} required />
        <SelectField
          label="Assign Technician"
          name="assigneeId"
          options={[{ value: "", label: "Leave unassigned" }, ...technicians.map((tech) => ({ value: tech.id, label: tech.name }))]}
        />
      </div>
      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      <div className="flex justify-end">
        <button className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#173b2d]" disabled={submitting} type="submit">
          {submitting ? "Creating..." : "Create Work Order"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, name, required = false }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-stone-700">
      {label}
      <input
        className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-pine"
        name={name}
        required={required}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  required = false
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-stone-700">
      {label}
      <select
        className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-pine"
        defaultValue=""
        name={name}
        required={required}
      >
        <option disabled value="">
          Select...
        </option>
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
```

#### File: `components/WorkOrderActions.tsx` — canonical source

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { priorities, statuses, type Technician } from "@/lib/types";

export function WorkOrderActions({
  workOrderId,
  currentStatus,
  currentPriority,
  currentAssigneeId,
  technicians
}: {
  workOrderId: string;
  currentStatus: string;
  currentPriority: string;
  currentAssigneeId: string | null;
  technicians: Technician[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const assigneeId = String(formData.get("assigneeId") ?? "");
    const response = await fetch(`/api/work-orders/${workOrderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: String(formData.get("status") ?? ""),
        priority: String(formData.get("priority") ?? ""),
        assigneeId: assigneeId || null
      })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to update work order");
      setBusy(false);
      return;
    }

    router.refresh();
    setBusy(false);
  }

  return (
    <form className="grid gap-4 rounded-[2rem] border border-stone-200 bg-white/90 p-5 shadow-card" onSubmit={handleUpdate}>
      <h3 className="text-lg font-semibold text-ink">Dispatch Actions</h3>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Status
        <select className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3" defaultValue={currentStatus} name="status">
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Priority
        <select className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3" defaultValue={currentPriority} name="priority">
          {priorities.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Assignee
        <select className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3" defaultValue={currentAssigneeId ?? ""} name="assigneeId">
          <option value="">Unassigned</option>
          {technicians.map((technician) => (
            <option key={technician.id} value={technician.id}>
              {technician.name}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      <button className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#173b2d]" disabled={busy} type="submit">
        {busy ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
```

#### File: `components/CommentForm.tsx` — canonical source

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function CommentForm({ workOrderId }: { workOrderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch(`/api/work-orders/${workOrderId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: String(formData.get("author") ?? ""),
        message: String(formData.get("message") ?? "")
      })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to add comment");
      setBusy(false);
      return;
    }

    form.reset();
    router.refresh();
    setBusy(false);
  }

  return (
    <form className="grid gap-4 rounded-[2rem] border border-stone-200 bg-white/90 p-5 shadow-card" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold text-ink">Add Comment</h3>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Author
        <input className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3" name="author" required />
      </label>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Note
        <textarea className="min-h-28 rounded-[1.5rem] border border-stone-200 bg-stone-50 px-4 py-3" name="message" required />
      </label>
      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      <button className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black" disabled={busy} type="submit">
        {busy ? "Posting..." : "Post Comment"}
      </button>
    </form>
  );
}
```

---

## Step 9 — App Routes (`app/`)

### `app/layout.tsx`

Server. Renders `<html lang="en">`, header with brand mark and nav (`Queue` → `/`, `New Request` → `/new`), and `{children}` inside `<main className="mx-auto max-w-6xl px-6 py-8">`.

### File: `app/page.tsx` — canonical source (Dashboard)

```tsx
import { FilterBar } from "@/components/FilterBar";
import { StatCard } from "@/components/StatCard";
import { WorkOrderTable } from "@/components/WorkOrderTable";
import { formatHours } from "@/lib/format";
import { getFacilities, getMetrics, getTechnicians, listWorkOrders } from "@/lib/store";
import { toWorkOrderFilters } from "@/lib/validators";
import { decorateWorkOrders } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = toWorkOrderFilters({
    status: pickString(params.status),
    priority: pickString(params.priority),
    category: pickString(params.category),
    facilityId: pickString(params.facilityId),
    assigneeId: pickString(params.assigneeId)
  });

  const [facilities, technicians, workOrders, metrics] = await Promise.all([
    getFacilities(),
    getTechnicians(),
    listWorkOrders(filters),
    getMetrics()
  ]);

  const decorated = decorateWorkOrders(workOrders, facilities, technicians);

  return (
    <main className="grid gap-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard accent="#1f4d3a" label="Mean Resolution" value={formatHours(metrics.meanTimeToResolutionHours)} />
        <StatCard accent="#a14a2a" label="Overdue Orders" value={String(metrics.overdueCount)} />
        <StatCard
          accent="#d2a855"
          label="Open Backlog"
          value={String(Object.values(metrics.openBacklogByPriority).reduce((sum, value) => sum + value, 0))}
        />
        <StatCard
          accent="#475569"
          label="Top Technician Load"
          value={metrics.technicianLoad[0] ? `${metrics.technicianLoad[0].technicianName} (${metrics.technicianLoad[0].openCount})` : "N/A"}
        />
      </section>

      <section className="grid gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">Operations Queue</p>
            <h1 className="font-[var(--font-heading)] text-4xl text-ink">Live work-order backlog</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-stone-600">
            Dispatchers can filter the queue, open a ticket, update status, assign technicians, and track overdue work against each priority SLA.
          </p>
        </div>
        <FilterBar currentFilters={filters} facilities={facilities} technicians={technicians} />
      </section>

      <WorkOrderTable workOrders={decorated} />
    </main>
  );
}

function pickString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
```

### `app/new/page.tsx`

Server. Force-dynamic. Loads facilities + technicians from `lib/store` and renders `<NewWorkOrderForm>`.

### File: `app/work-orders/[id]/page.tsx` — canonical source (Detail View)

```tsx
import Link from "next/link";
import { CommentForm } from "@/components/CommentForm";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkOrderActions } from "@/components/WorkOrderActions";
import { formatDateTime } from "@/lib/format";
import { getFacilities, getTechnicians, getWorkOrder } from "@/lib/store";
import { decorateWorkOrder } from "@/lib/view-models";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [workOrder, facilities, technicians] = await Promise.all([getWorkOrder(id), getFacilities(), getTechnicians()]);

  if (!workOrder) {
    notFound();
  }

  const decorated = decorateWorkOrder(workOrder, facilities, technicians);

  return (
    <main className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
      <section className="grid gap-6">
        <div className="rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">{decorated.id}</p>
              <h1 className="font-[var(--font-heading)] text-4xl text-ink">{decorated.title}</h1>
              <p className="max-w-3xl text-sm leading-7 text-stone-600">{decorated.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={decorated.status} />
              <StatusBadge kind="priority" value={decorated.priority} />
              {decorated.overdue ? <StatusBadge kind="meta" value="Overdue" /> : null}
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Meta label="Facility" value={decorated.facilityName} />
            <Meta label="Assignee" value={decorated.assigneeName ?? "Unassigned"} />
            <Meta label="Requester" value={decorated.requesterName} />
            <Meta label="Updated" value={formatDateTime(decorated.updatedAt)} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-ink">Activity Log</h2>
              <Link className="text-sm font-semibold text-stone-500 underline-offset-4 hover:underline" href="/">
                Back to queue
              </Link>
            </div>
            <div className="mt-5 grid gap-4">
              {decorated.activity
                .slice()
                .reverse()
                .map((event) => (
                  <article className="rounded-[1.5rem] border border-stone-100 bg-stone-50 p-4" key={event.id}>
                    <p className="text-sm font-semibold text-ink">{event.message}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-400">{formatDateTime(event.createdAt)}</p>
                  </article>
                ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-card">
            <h2 className="text-xl font-semibold text-ink">Comments</h2>
            <div className="mt-5 grid gap-4">
              {decorated.comments.length === 0 ? (
                <p className="text-sm text-stone-500">No comments yet.</p>
              ) : (
                decorated.comments
                  .slice()
                  .reverse()
                  .map((comment) => (
                    <article className="rounded-[1.5rem] border border-stone-100 bg-stone-50 p-4" key={comment.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">{comment.author}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-stone-400">{formatDateTime(comment.createdAt)}</p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-stone-600">{comment.message}</p>
                    </article>
                  ))
              )}
            </div>
          </section>
        </div>
      </section>

      <aside className="grid gap-6 self-start">
        <WorkOrderActions
          currentAssigneeId={decorated.assigneeId}
          currentPriority={decorated.priority}
          currentStatus={decorated.status}
          technicians={technicians}
          workOrderId={decorated.id}
        />
        <CommentForm workOrderId={decorated.id} />
      </aside>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{label}</p>
      <p className="mt-2 text-base font-semibold text-ink">{value}</p>
    </div>
  );
}
```

### `app/api/work-orders/route.ts`

- `GET`: parses `URLSearchParams` via `toWorkOrderFilters`, returns `listWorkOrders(filters)`.
- `POST`: parses JSON; validates required strings and enum membership; returns `createWorkOrder(...)` with status 201. On thrown validation error returns `{ error: e.message }` with status 400.

### `app/api/work-orders/[id]/route.ts`

- `GET`: returns `getWorkOrder(id)` or `{ error: "Not found" }` (404).
- `PATCH`: JSON body; treat `assigneeId === null` as explicit unassign; returns updated WorkOrder.

### `app/api/work-orders/[id]/comments/route.ts`

- `POST`: JSON body `{ author, message }`; returns 201 with the new `WorkOrderComment`.

### `app/api/metrics/route.ts`

- `GET`: returns `getMetrics()`.

### `app/api/mcp/route.ts`

Per Step 6.

---

## Step 10 — Scripts (`scripts/`)

| Script | Behavior |
|---|---|
| `env-loader.ts` | Loads `.env.local` into `process.env` for tsx-run scripts. |
| `mcp-server.ts` | Per Step 6. |
| `check-supabase.ts` | Loads env. Builds the server client. Queries counts of facilities, technicians, work_orders. Prints them and the Supabase host. Exits non-zero on failure. |
| `seed-supabase.ts` | Loads env. Reads `data/db.json`. Upserts facilities, technicians, work orders, activity, comments into Supabase. Idempotent on stable IDs. |

---

## Step 11 — Running the Application

1. `npm install`
2. **Demo mode (JSON):** `npm run dev` — opens `http://localhost:3000`. No env needed.
3. **Supabase mode:**
   1. Copy `.env.example` → `.env.local`.
   2. Set `DATA_PROVIDER=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   3. Apply migration: `supabase db push` (or `psql -f supabase/migrations/20260616230000_initial_schema.sql`).
   4. Seed: `npm run supabase:seed`.
   5. Verify: `npm run supabase:check` should report 3/3/3.
   6. `npm run dev`.
4. **MCP stdio:** `npm run mcp`. Connect any MCP-compatible client; call `tools/list`, then `tools/call` with one of the six tools.
5. **MCP HTTP:** `curl http://localhost:3000/api/mcp` and `curl -X POST .../api/mcp -d '{"tool":"list_work_orders","arguments":{}}'`.
6. `npm run typecheck` and `npm run build` MUST pass.

---

## Step 12 — Verification Matrix (Acceptance Tests)

The repository includes a small Vitest suite covering the pure domain functions. Run it with:

```bash
npm test
```

Expected: 3 test files, 14 tests passing (`lib/sla.test.ts`, `lib/metrics.test.ts`, `lib/validators.test.ts`). The suite exercises `getSlaHours`, `isClosedStatus`, `isOverdue`, `calculateMetrics` (including the tiebreak rule for `technicianLoad`), and the validator coercions. A regenerated implementation MUST pass this suite unmodified.

The end-to-end matrix below is intended for manual or scripted acceptance against a running app:


| # | Scenario | Expected |
|---|---|---|
| 1 | `GET /api/work-orders` | Returns the three seeded work orders in `createdAt` desc order. |
| 2 | `POST /api/work-orders` with valid body | 201; the new order appears in `GET /api/work-orders`. |
| 3 | `POST /api/work-orders` missing `title` | 400 with `{ error: "title must be a non-empty string" }` (or equivalent). |
| 4 | `POST /api/work-orders` with `assigneeId` | Returned order has `status="Assigned"` and an `assigned` activity entry. |
| 5 | `PATCH /api/work-orders/:id { status:"Resolved" }` on an open order | `resolvedAt` becomes non-null; activity has `status_changed`. |
| 6 | `PATCH /api/work-orders/:id { status:"Closed" }` on unresolved order | 400 / rejected by trigger. |
| 7 | `GET /api/metrics` | Returns Metrics object; `meanTimeToResolutionHours` is a number when at least one resolved order exists. |
| 8 | `POST /api/work-orders/:id/comments` | 201; `comment_added` activity appended; `updatedAt` bumped. |
| 9 | `GET /api/mcp` | Returns `{ tools: [...6 tools...] }`. |
| 10 | `POST /api/mcp { tool:"list_work_orders", arguments:{ priority:"Urgent" } }` | Returns `{ result: WorkOrder[] }` filtered. |
| 11 | Stdio MCP `tools/list` | Returns the 6 tools. |
| 12 | Switching `DATA_PROVIDER=json ↔ supabase` | Same UI; same API responses (modulo IDs). |

---

## Step 13 — Regeneration Contract

An LLM agent given this document is expected to produce:

1. Every file path enumerated above with the described responsibilities.
2. Exports and signatures matching the snippets and tables.
3. A passing `npm run typecheck` and `npm run build` on the regenerated tree (against the listed dependency versions).
4. JSON contracts that satisfy the **Verification Matrix** in Step 12.

If any acceptance test fails after regeneration, the failing item identifies the gap in this document.
