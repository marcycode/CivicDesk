# Supabase Schema Notes

This folder prepares CivicDesk for the Supabase-backed version requested in the PRD.

## Files

- `migrations/20260616230000_initial_schema.sql`: core enums, tables, triggers, indexes, views, and RLS policies
- `seed.sql`: development seed data aligned with the current local JSON dataset
- `config.toml`: local Supabase CLI config

## Schema shape

- `profiles`: maps Supabase auth users to CivicDesk roles
- `facilities`: maintained buildings and sites
- `technicians`: technician records, optionally linked to auth profiles
- `work_orders`: central request record with requester, facility, category, priority, status, assignee, and timestamps
- `work_order_comments`: threaded notes on each order
- `work_order_activity`: audit trail for creation, reassignment, status changes, priority changes, and comments
- `priority_slas`: editable SLA targets by priority

## Built-in behaviors

- `updated_at` is maintained automatically with triggers
- assigning a technician can automatically move an `Open` ticket to `Assigned`
- moving to `Resolved` or `Closed` stamps `resolved_at`
- `work_order_activity` is written automatically for status, priority, assignment, and comment changes
- queue and metrics views are available directly in SQL for dashboards and MCP tooling

## Next step

When you are ready, we can wire the app off the JSON store and onto `@supabase/supabase-js` plus real role-aware queries against this schema.
