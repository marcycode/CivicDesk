# CivicDesk — Submission Packet

Sample project submitted for the **City of Los Angeles, Department of General Services — Paid Telecommuting Internship: Agentic Software Engineering**.

This index lists the four submission components required by the program brief.

## Submission Components

| # | Component | File / Location |
|---|---|---|
| 1 | **Business Statement** | [BUSINESS_STATEMENT.md](./BUSINESS_STATEMENT.md) |
| 2 | **Logical Structure Document** | [LOGICAL_STRUCTURE.md](./LOGICAL_STRUCTURE.md) |
| 3 | **Technical Implementation Guide** | [TECHNICAL_IMPLEMENTATION.md](./TECHNICAL_IMPLEMENTATION.md) |
| 4 | **Application Code** | This repository — entry points: [`app/`](./app/), [`components/`](./components/), [`lib/`](./lib/), [`scripts/`](./scripts/), [`supabase/`](./supabase/) |

## How to Validate the Packet

The brief states:

> We will feed your Markdown documentation directly into Gemini to test if the LLM can successfully re-generate your intended application artifacts from your text alone.

The three Markdown documents above are written to that contract. Specifically:

- `BUSINESS_STATEMENT.md` is the "why" — problem, value, target users, success metrics, scope boundaries.
- `LOGICAL_STRUCTURE.md` is the "what" — system context diagram, module map, layering invariants, end-to-end data flows, ER diagram, enumerations, business rules, metric definitions, REST and MCP contracts, and a Reproducibility Contract.
- `TECHNICAL_IMPLEMENTATION.md` is the "how" — a 13-step algorithmic blueprint that ends with a Verification Matrix. Each step depends only on earlier steps so that an agent can execute it linearly.

## Running the Application Locally

Zero-config demo (file-backed JSON store, no external services):

```bash
npm install
npm run dev
# open http://localhost:3000
```

Production-shaped Supabase mode:

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
# set DATA_PROVIDER=supabase
supabase db push          # applies supabase/migrations/*.sql
npm run supabase:seed     # seeds 3 facilities, 3 technicians, 3 work orders
npm run supabase:check    # expect: facilities=3, technicians=3, work_orders=3
npm run dev
```

MCP surface:

```bash
npm run mcp                                # stdio JSON-RPC server
curl http://localhost:3000/api/mcp         # HTTP catalog
```

Quality gates:

```bash
npm run typecheck
npm run build
```

## Repository Map (quick reference)

| Path | Purpose |
|---|---|
| `app/` | Next.js App Router pages and API routes (REST + MCP HTTP bridge) |
| `components/` | UI components (presentational + client-form components) |
| `lib/` | Domain types, SLA logic, metrics, validators, view models, provider-switching store |
| `data/db.json` | File-backed JSON store used in demo mode |
| `supabase/migrations/` | Postgres schema (enums, tables, triggers, views, RLS) |
| `supabase/seed.sql` | Mirrored seed data for Supabase mode |
| `scripts/` | MCP stdio server, Supabase check/seed scripts, env loader |
| `BUSINESS_STATEMENT.md` | Component 1 |
| `LOGICAL_STRUCTURE.md` | Component 2 |
| `TECHNICAL_IMPLEMENTATION.md` | Component 3 |

## Submitting Safely

The repository may sit alongside a populated `.env.local` containing a real Supabase service-role key (the file is `.gitignore`'d but exists on disk). To ship the artifact safely:

- **Prefer a GitHub link.** `.env.local`, `.next/`, and `node_modules/` are already excluded by `.gitignore`. A clone reproduces the demo with `npm install && npm run dev`.
- **If shipping a zip, generate it from the git index, not the working tree.** From inside the repo:

  ```bash
  git archive HEAD --format=zip -o civicdesk.zip
  ```

  This guarantees untracked files (including `.env.local`) cannot ride along. After generating, run `unzip -l civicdesk.zip | grep -i env` and confirm only `.env.example` is present.
- **Reset the demo dataset between runs.** The JSON store at `data/db.json` is mutated in place; restore it with `git checkout data/db.json`.

## Notes on Scope

The Markdown documents intentionally describe the production-shaped target (Supabase Auth + role-aware RLS) while the in-repo MVP runs the same domain logic against a JSON file by default so the reviewer can exercise the full UI and MCP surface with `npm install && npm run dev` and nothing else. Roadmap items not yet implemented in the source (end-user auth UI, dedicated leadership reporting screen, automated test suite) are called out explicitly in `BUSINESS_STATEMENT.md §7` (Scope Boundaries).

## Contact

Submitted by **Nodshley Marcelin** for review by **Charles Huang** (`charles.x.huang@lacity.org`).
