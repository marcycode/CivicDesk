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
