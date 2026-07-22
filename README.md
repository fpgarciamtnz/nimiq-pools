# NimiqPools

NimiqPools is an independent project initialized from the `projections and leage` codebase as a technical base. It has its own Git history, GitHub repository, Cloudflare Pages project, and D1 database. Do not share deployment identifiers, secrets, data, or product assumptions with the source project.

## Current product

NimiqPools is a Nuxt full-stack app for friend-run World Cup pick parties. A user connects Nimiq Pay before entering the app. Leagues and predictions are then attached to that wallet account instead of the current browser.

Signing in asks Nimiq Pay to approve a short-lived message. It does not create a transaction or request a payment. The server verifies the Nimiq signature, stores only a hash of the random session token, and sends the browser an HTTP-only session cookie.

## Setup

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example` and set a real admin PIN before sharing the app.

```bash
copy .env.example .env
```

Initialize local SQLite data:

```bash
npm run db:init
```

The seed creates:

- Demo invite URL: `/invite/worldcup`
- Your Tournament shortcut: `/tournament`
- Admin page: `/admin`
- 48 qualified teams using FIFA's 1 April 2026 ranking cutoff
- Deterministic fake predictions and manual results for the leaderboard preview
- Default admin PIN from `NUXT_ADMIN_PIN` (`change-me` in `.env.example`)

Optional football-data.org ingestion uses server-only environment variables:

- `FOOTBALL_DATA_KEY`: football-data.org v4 token.
- `FOOTBALL_DATA_COMPETITION_CODE`: `WC` for the FIFA World Cup.
- `FOOTBALL_DATA_SEASON`: `2026`.
- `FOOTBALL_DATA_CRON_SECRET`: shared secret for cron-triggered sync calls.
- `FOOTBALL_DATA_DAILY_LIMIT`: daily football-data.org request budget, default `100`.
- `FOOTBALL_DATA_DAILY_RESERVE`: requests reserved for final settlement checks, default `10`.
- `NIMIQ_POOLS_BASE_URL`: scheduler Worker target origin for smart milestone sync.

## Development

```bash
npm run dev
```

## Verification

```bash
npm test
npm run build
```

The repository also includes a live login verification that uses the real message signer from the sibling Nimiq simulator. Start this app on port `3000`, then run:

```bash
npm run test:nimiq-login
```

By default it loads `../Nimiq-Simulator`. Override `NIMIQ_SIMULATOR_PATH` or `PICK_PARTY_URL` when either project or server is elsewhere. The verifier creates temporary wallets, signs real server challenges, verifies session cookies, creates a league and prediction, proves a second wallet cannot read or edit the first wallet's private entry, and removes its test data afterward.

## MVP Surfaces

- `/login` connects the injected Nimiq Pay wallet and returns the user to the page they originally requested.
- `/` lets a signed-in wallet create a league, optionally add a picture, and become its owner.
- `/tournament` shows leagues owned by or joined through the current wallet.
- `/invite/:code` opens an invite for a signed-in wallet, lets that wallet create or edit only its own prediction before the deadline, and shows rankings after the deadline.
- `/admin` lets the admin update the global deadline, manual tournament finish stages, and delete entries.
- `/api/live-fixtures` exposes cached live scores from the local database.
- `/api/sync/status` exposes the latest local football-data.org sync status.

The global route gate requires a valid wallet session to enter the app. League ownership and participation are persisted in the database. Prediction writes resolve the entry from the authenticated user ID; a submitted entry ID cannot be used to edit another wallet's prediction. Ballots remain private until the reveal deadline, except that each wallet can always retrieve its own entry for editing and Pick'em continuity.

## Cloudflare D1 migration

Apply the Nimiq authentication and ownership migration to an existing local or remote D1 database with:

```bash
npm run d1:migrate:local
npm run d1:migrate:remote
```

The reset scripts also include this migration after all earlier schema changes.

## football-data.org Sync

The browser never calls football-data.org directly. Sync jobs run on the server and cache teams, fixtures, standings, and live scores in SQLite.

Admin-triggered sync:

```bash
curl -X POST http://localhost:3000/api/admin/sync \
  -H "content-type: application/json" \
  -H "x-admin-pin: $NUXT_ADMIN_PIN" \
  -d "{\"job\":\"daily\"}"
```

Available admin jobs are `daily`, `hourly`, `live`, and `all`. Daily sync bootstraps teams, rounds, and fixtures from `/competitions/WC/teams`, `/competitions/WC/matches`, and `/competitions/WC/standings`. Hourly sync refreshes matches and standings for the configured season. Live sync refreshes cached fixtures and marks currently active matches for the live-score panel.

Smart milestone sync:

```bash
curl -X POST https://your-app.example/api/cron/football-data-smart-sync \
  -H "content-type: application/json" \
  -H "x-cron-secret: $FOOTBALL_DATA_CRON_SECRET" \
  -d "{}"
```

Tournament sync is disabled now that the tournament has ended. The scheduler has no Cloudflare cron trigger, and the smart-sync endpoint returns `410 Gone` without calling football-data.org. See `docs/football-data-call-budget.md` for the historical free-tier strategy.

For production milestone scheduling, deploy the separate Cloudflare Cron Worker:

```bash
npm run deploy:scheduler
```

## Scoring

The beta ballot has exactly four equal team slots:

- Team 1: any qualified team.
- Team 2: any qualified team.
- Team 3: any qualified team.
- Team 4: any qualified team.

Each team slot scores from cached fixtures using:

```text
3 points per win + non-shootout goals for + 1 point for reaching each of the semifinal and final
```

Goals against are shown in score breakdowns but do not remove points. Draws do not earn points. If a knockout match reaches penalties, shootout goals do not count for ballot scoring, while the match winner receives the 3 win points. Teams receive 1 bonus point for reaching the semifinal and another 1 bonus point for reaching the final.

Ballots and rankings stay hidden until the global deadline passes. football-data.org sync caches fixtures and standings server-side, and league drama moments are derived from cached fixtures plus visible picks.
