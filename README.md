# SkillSwap

Neighbours teaching neighbours, free of charge. Find someone nearby who can teach a skill, book a session, and give them points afterwards. The product spec is in [specs.md](specs.md).

Stack: Vite + React + TypeScript, Tailwind CSS, React Router, TanStack Query, and Supabase (Auth, Postgres, row-level security). There is no server code: every rule is enforced in the database.

## Setup

Requirements: Node 20+ and rootless Podman.

```bash
npm install
cp .env.example .env        # then fill in the two values, see below
npm run db:start            # starts local Supabase, applies migrations and the seed
npm run dev                 # http://localhost:5173
```

### Where Supabase runs

All `db:*` scripts go through [scripts/supabase.sh](scripts/supabase.sh). It starts a Podman API service whose storage is the gitignored `./.supabase` folder, so images, containers and the database volume stay inside the project and off the root partition. Your default Podman store is not touched.

- Run any other CLI command the same way: `scripts/supabase.sh status`.
- Podman's own health-check timers do not support a custom store, so the script runs the container health checks itself while the service is up.
- To delete everything, run `npm run db:stop`, stop the service (`pkill -f "$PWD/.supabase/podman.sock"`), then `podman unshare rm -rf .supabase`. The files belong to sub-UIDs, so a plain `rm` fails.

### Environment variables

| Variable | Where to find it |
| --- | --- |
| `VITE_SUPABASE_URL` | `npm run db:status` → API URL (local: `http://127.0.0.1:54321`), or Supabase → Project Settings → Data API |
| `VITE_SUPABASE_PUBLISHABLE` | `npm run db:status` → `PUBLISHABLE_KEY`, or Supabase → Project Settings → API Keys → publishable key (`sb_publishable_…`) |

The variable name avoids the word "KEY" because Vercel blocks browser-exposed variables named like secrets. The legacy `VITE_SUPABASE_ANON_KEY` is still read as a fallback.

Only the public key goes to the browser. Never put the secret or service-role key in `.env`.

## Database

- Schema, triggers, row-level security and views: [supabase/migrations/](supabase/migrations/)
- Seed (idempotent, dates relative to the day it runs): [supabase/seed.sql](supabase/seed.sql)

| Task | Command |
| --- | --- |
| Re-apply migrations and seed locally (wipes local data) | `npm run db:reset` |
| Stop local Supabase | `npm run db:stop` |
| Regenerate TypeScript types | `npm run db:types` |
| Build one SQL file for a hosted project | `npm run db:bundle` → `supabase/hosted.sql` |

**Hosted Supabase project:** in Authentication → Providers → Email, turn off "Confirm email" (A11). Then paste `supabase/hosted.sql` into the SQL editor and run it. The seed creates auth users directly, so it must run as the `postgres` role, which the SQL editor does.

## Rate limiting (login and registration)

Login and registration go straight from the browser to Supabase Auth, so limits work in two layers:

| Layer | Limit | Where |
| --- | --- | --- |
| Supabase Auth, per IP address (authoritative) | 30 sign-ins and sign-ups per 5 minutes | Hosted: Authentication → Rate Limits. Local: `sign_in_sign_ups` in `supabase/config.toml`, which the local CLI stack does not enforce |
| App, per browser | 5 failed attempts per 15 minutes locks the form with a countdown; a server "too many requests" answer pauses it for 5 minutes | [src/lib/rateLimit.ts](src/lib/rateLimit.ts) |

The app layer is a usability and speed bump, since it lives in the browser and can be bypassed by calling the API directly. Failed logins count, and so do registration attempts that hit a taken username or an already registered email, so the form cannot be used to probe accounts. For stronger protection against bots, turn on CAPTCHA in Supabase (Authentication → Attack Protection) and add the widget to both forms.

## Demo accounts

All seeded accounts use the password `skillswap123`.

| Email | What it shows |
| --- | --- |
| `demo@skillswap.test` (Alex) | Rich history: teaches Guitar, learns Spanish; incoming requests and an invitation, an accepted class, completed bookings, and one completed booking still waiting for points |
| `new@skillswap.test` (Sam) | Freshly registered: no skills, availability or bookings |

Every other seeded member logs in as `<username>@skillswap.test`, for example `jana_k@skillswap.test`.

## Tests

```bash
npm test
```

Unit tests cover the pure matching function ([src/lib/match.ts](src/lib/match.ts)) and the people recommender ([src/lib/recommend.ts](src/lib/recommend.ts)) for every factor and the tie-breaking, plus the Bratislava time helpers and the `.ics` builder. Weights live in `MATCH_WEIGHTS` and `RECOMMEND_WEIGHTS`.

## Where things are

| Path | Contents |
| --- | --- |
| `src/pages/` | One component per route (Section 7) |
| `src/lib/api.ts` | All Supabase queries |
| `src/lib/match.ts` | Scoring and ranking (Section 6), with no database access |
| `src/lib/recommend.ts` | People recommender on `/people`: suggests skill swaps, teachers and learners from everyone's teach and learn lists |
| `src/components/BookingItem.tsx` | Booking actions: accept, decline, cancel, complete, `.ics`, points |
