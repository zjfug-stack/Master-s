# Masters Pool 2026

A Next.js 14 App Router fantasy pool for the 2026 Masters Tournament.
Pick one golfer from each of 6 tiers — lowest combined score wins.

## Stack

- **Next.js 14** — App Router, TypeScript, Tailwind CSS
- **Prisma 5** — ORM with PostgreSQL
- **Sportradar Golf API** — live scores (server-side only)

---

## Environment Variables

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/masters_pool` |

### Required at runtime (set in Vercel)

| Variable | Description |
|---|---|
| `SPORTRADAR_API_KEY` | Sportradar Golf API key — **never expose to the client** |
| `SPORTRADAR_TOURNAMENT_ID` | Sportradar tournament ID for the 2026 Masters (e.g. `sr:tournament:masters2026`) |
| `CRON_SECRET` | Shared secret protecting `POST /api/scores/sync` — set `Authorization: Bearer <CRON_SECRET>` on your cron job |

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
# edit .env and fill in your values
```

---

## Database setup

```bash
# 1. Run migrations (creates all tables)
npx prisma migrate dev --name init

# 2. Seed the 2026 pool and tiers 1–6
npm run db:seed

# 3. (Optional) Open Prisma Studio
npm run db:studio
```

### Schema overview

| Model | Purpose |
|---|---|
| `Pool` | One row per tournament year |
| `Tier` | Skill-based golfer groups (1 = elite, 6 = long shots) |
| `Golfer` | Masters field; `sportradarId` links to Sportradar API |
| `TierGolfer` | Assigns a golfer to a tier within a pool |
| `Entry` | One entrant submission per pool |
| `Pick` | One golfer per tier per entry |
| `Substitution` | Mid-tournament replacement tracking (WD/injury) |
| `LiveScore` | Per-golfer scores synced from Sportradar |
| `LeaderboardCache` | Computed pool standings cached as JSON (60s TTL) |

---

## Development

```bash
npm install
npm run dev        # starts on http://localhost:3000
npm run build      # prisma generate + next build
npm run db:migrate # run pending migrations
npm run db:seed    # seed pool + tiers
npm run db:studio  # Prisma Studio GUI
```

---

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/leaderboard` | Pool standings (cached, 60s TTL) |
| `GET` | `/api/golfers` | Golfers grouped by tier |
| `GET` | `/api/entries` | All entries with picks |
| `POST` | `/api/entries` | Submit an entry (6 picks, one per tier) |
| `POST` | `/api/scores/sync` | Sync live scores from Sportradar (**requires `CRON_SECRET`**) |

### Score sync (cron)

Call `POST /api/scores/sync` every 90 seconds during tournament rounds:

```bash
curl -X POST https://your-app.vercel.app/api/scores/sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

Vercel Cron configuration (`vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/scores/sync",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

> Note: Vercel Cron does not support `Authorization` headers natively.
> Use a separate cron service (e.g. cron-job.org) or a Vercel Edge Function wrapper.

---

## Deployment (Vercel)

1. Connect repo to Vercel.
2. Set all environment variables listed above in the Vercel dashboard.
3. Vercel runs `npm run build` → `prisma generate && next build`.
4. After first deploy, run migrations and seed via the Vercel CLI or a one-off job:

```bash
vercel env pull .env.production.local
npx prisma migrate deploy
npx prisma db seed
```
