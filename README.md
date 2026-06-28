# 🏆 World Cup Predictions

A small web app for running a private World Cup prediction competition with
friends. Create a competition, share the join code, and everyone predicts the
results of the current round. Points are awarded automatically.

## Scoring

For each match in a knockout round:

| Points | For |
| ------ | --- |
| **+2** | Picking the team that **qualifies** (advances) |
| **+1** | Exact **goal difference** after 90 minutes |
| **+1** | Exact **score** after 90 minutes |

An exact score also satisfies the goal-difference rule, so a perfect knockout
prediction is worth **4 points**. Group-stage matches (if you choose to predict
them) are worth up to 2 points — no qualifier bonus.

## How it works

- **No passwords.** A friend opens the link, enters the join code, and picks a
  display name. The browser remembers them with a cookie.
- **Per-competition admin.** Whoever creates a competition gets a secret
  organiser link (`/c/<CODE>/admin?token=…`). Bookmark it — it's the only way
  back into the management screen.
- **Live data, with a manual fallback.** If a `FOOTBALL_DATA_TOKEN` is set, the
  organiser can sync fixtures and final scores from
  [football-data.org](https://www.football-data.org). Otherwise (or to correct
  anything), the organiser enters matches and 90-minute scores by hand.
- **Predictions lock at kickoff.** Once a match starts, predictions for it can
  no longer be changed.

## Tech

Next.js (App Router) · Prisma · PostgreSQL · Tailwind CSS.

## Local development

```bash
npm install

# 1. Point DATABASE_URL at any Postgres instance
cp .env.example .env
#    (edit .env)

# 2. Create the schema
npm run prisma:push

# 3. (optional) seed a demo competition
npm run prisma:seed

# 4. Run it
npm run dev
```

Run the scoring unit tests with:

```bash
npm test
```

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel.
2. Add a Postgres database (Vercel Postgres or Neon) — Vercel will set
   `DATABASE_URL` for you.
3. (Optional) add `FOOTBALL_DATA_TOKEN` from football-data.org for live syncing.
4. Run `npm run prisma:push` once against the production database to create the
   tables (e.g. locally with the production `DATABASE_URL`, or as a build step).

The `build` script runs `prisma generate` automatically.

## Live data notes

- The free football-data.org tier exposes a limited set of competitions and is
  rate-limited (~10 requests/minute). The World Cup competition code is `WC`.
- Knockout scores from the API may include extra time. The app stores whatever
  the API reports as the "full time" score; **always double-check the
  90-minute score in the admin screen** and correct it if a match went to extra
  time, since scoring is defined on the 90-minute result.
