insert into public.facilities (id, name, address)
values
  ('11111111-1111-1111-1111-111111111111', 'City Hall', '110 Laurier Ave W'),
  ('22222222-2222-2222-2222-222222222222', 'Main Library', '120 Metcalfe St'),
  ('33333333-3333-3333-3333-333333333333', 'Riverside Recreation Centre', '456 Riverside Dr')
on conflict (id) do update
set
  name = excluded.name,
  address = excluded.address;

insert into public.technicians (id, name, trade)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Maya Chen', 'HVAC'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Andre Bouchard', 'Electrical'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Leila Singh', 'Plumbing')
on conflict (id) do update
set
  name = excluded.name,
  trade = excluded.trade;

insert into public.work_orders (
  id,
  title,
  description,
  requester_name,
  facility_id,
  category,
  priority,
  status,
  assigned_technician_id,
  created_at,
  updated_at,
  resolved_at
)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001',
    'City Hall rooftop HVAC unit short cycling',
    'Unit 3 is turning on and off every few minutes and the west wing is above target temperature.',
    'Jordan Price',
    '11111111-1111-1111-1111-111111111111',
    'HVAC',
    'High',
    'Assigned',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '2026-06-14T13:15:00Z',
    '2026-06-15T08:30:00Z',
    null
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002',
    'Stuck elevator at Main Library',
    'Passenger elevator stopped on the second floor and is currently out of service.',
    'Samira Ali',
    '22222222-2222-2222-2222-222222222222',
    'Structural',
    'Urgent',
    'In Progress',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '2026-06-16T12:10:00Z',
    '2026-06-16T13:00:00Z',
    null
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003',
    'Leak under washroom sink',
    'Ground-floor washroom sink drips continuously into the cabinet.',
    'Noah Peters',
    '33333333-3333-3333-3333-333333333333',
    'Plumbing',
    'Medium',
    'Resolved',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '2026-06-10T09:00:00Z',
    '2026-06-11T17:30:00Z',
    '2026-06-11T17:30:00Z'
  )
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  requester_name = excluded.requester_name,
  facility_id = excluded.facility_id,
  category = excluded.category,
  priority = excluded.priority,
  status = excluded.status,
  assigned_technician_id = excluded.assigned_technician_id,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  resolved_at = excluded.resolved_at;

delete from public.work_order_activity
where work_order_id in (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003'
);

insert into public.work_order_activity (id, work_order_id, event_type, message, created_at)
values
  ('cccccccc-cccc-cccc-cccc-ccccccccc001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001', 'created', 'Work order created by Jordan Price', '2026-06-14T13:15:00Z'),
  ('cccccccc-cccc-cccc-cccc-ccccccccc002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001', 'assigned', 'Assigned to Maya Chen', '2026-06-15T08:30:00Z'),
  ('cccccccc-cccc-cccc-cccc-ccccccccc003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', 'created', 'Work order created by Samira Ali', '2026-06-16T12:10:00Z'),
  ('cccccccc-cccc-cccc-cccc-ccccccccc004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', 'assigned', 'Assigned to Andre Bouchard', '2026-06-16T12:20:00Z'),
  ('cccccccc-cccc-cccc-cccc-ccccccccc005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', 'status_changed', 'Status changed to In Progress', '2026-06-16T13:00:00Z'),
  ('cccccccc-cccc-cccc-cccc-ccccccccc006', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003', 'created', 'Work order created by Noah Peters', '2026-06-10T09:00:00Z'),
  ('cccccccc-cccc-cccc-cccc-ccccccccc007', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003', 'assigned', 'Assigned to Leila Singh', '2026-06-10T09:15:00Z'),
  ('cccccccc-cccc-cccc-cccc-ccccccccc008', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003', 'status_changed', 'Status changed to Resolved', '2026-06-11T17:30:00Z')
on conflict (id) do update
set
  work_order_id = excluded.work_order_id,
  event_type = excluded.event_type,
  message = excluded.message,
  created_at = excluded.created_at;

insert into public.work_order_comments (id, work_order_id, author_name, message, created_at)
values
  (
    'dddddddd-dddd-dddd-dddd-ddddddddd001',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001',
    'Maya Chen',
    'Inspecting the compressor controls this morning.',
    '2026-06-15T08:45:00Z'
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddd002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003',
    'Leila Singh',
    'Replaced the trap seal and tested for 10 minutes with no active leak.',
    '2026-06-11T17:31:00Z'
  )
on conflict (id) do update
set
  work_order_id = excluded.work_order_id,
  author_name = excluded.author_name,
  message = excluded.message,
  created_at = excluded.created_at;

update public.work_orders
set updated_at = seed_values.updated_at
from (
  values
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001'::uuid, '2026-06-15T08:30:00Z'::timestamptz),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002'::uuid, '2026-06-16T13:00:00Z'::timestamptz),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003'::uuid, '2026-06-11T17:30:00Z'::timestamptz)
) as seed_values(id, updated_at)
where public.work_orders.id = seed_values.id;
