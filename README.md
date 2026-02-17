# Masters Pool 2026

Production-ready Next.js 14 app for running a Masters pool with tiered picks, live scoring ingestion, and admin operations.

## Stack
- Next.js 14+ App Router, TypeScript, Tailwind
- Postgres (Neon recommended) + Prisma ORM
- Vercel deployment + Vercel Cron
- Sportradar server-side ingest provider module

## Setup
1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies: `npm install`
3. Generate prisma client: `npm run prisma:generate`
4. Run migrations: `npx prisma migrate deploy` (or `npm run prisma:migrate` in dev)
5. Seed base pool/tiers: `npm run prisma:seed`
6. Start app: `npm run dev`

## Environment Variables
- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `CRON_SECRET`
- `SPORTRADAR_API_KEY`
- `SPORTRADAR_ACCESS_LEVEL` (`trial` or `production`)
- `SPORTRADAR_GOLF_TOUR` (`pga`)
- `SPORTRADAR_LANG` (`en`)
- `NEXT_PUBLIC_SITE_NAME`
- Optional: `MASTERS_PARENT_ID`

## Vercel Cron
Create a cron job hitting:
- Path: `/api/cron/ingest`
- Frequency: every 60-120 seconds during tournament hours
- Header: `x-cron-secret: <CRON_SECRET>`

Example `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/ingest", "schedule": "*/2 13-23 * * 4-7" }
  ]
}
```

## Notes
- Leaderboard API serves `leaderboard_cache`, so it remains available if Sportradar is down.
- Sportradar URLs in `lib/sportradar.ts` include TODO comments for exact endpoint contract verification.
- No client-side calls to Sportradar are used.
