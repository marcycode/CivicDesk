# Tomorrow Plan

## First Priority

- Implement Supabase authentication in the app
- Add sign-in and sign-out flows
- Create the `profiles` bootstrap flow so authenticated users get mapped to CivicDesk roles
- Replace the current service-role style server access with auth-aware request handling where possible

## Product Work

- Build role-based experiences for:
  - Requester
  - Dispatcher
  - Technician
  - Leadership
- Add a dedicated reporting screen for leadership
- Surface clearer overdue and SLA status in the UI

## Backend Hardening

- Verify row-level security behavior for each role
- Generate canonical Supabase TypeScript types from the live schema
- Tighten the MCP and API layer around authenticated access patterns

## Quality

- Add tests for:
  - work-order CRUD
  - metrics calculations
  - Supabase-backed data access
  - role-sensitive route behavior

## Quick Start Tomorrow

1. Run `npm run supabase:check`
2. Start the app with `npm run dev`
3. Begin auth integration from the current Supabase-backed store layer
