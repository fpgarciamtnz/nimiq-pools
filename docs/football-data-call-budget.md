# football-data.org Call Budget

Pick Party keeps football-data.org calls server-side and caches match data locally. The free football-data.org tier is useful for this app only if live score refreshes are treated as scheduled milestone checks, not constant polling.

## Free-Tier Strategy

- Provider window: football-data.org reports remaining requests through `X-RequestsAvailable` and reset seconds through `X-RequestCounter-Reset`.
- Normal baseline: smart sync can refresh team mapping when missing and the full fixture schedule once per day when the cache is stale or empty.
- Matchday live-ish updates: smart milestone sync refreshes only when cached fixtures have a due call.
- Base milestones per fixture:
  - `pregame_check`: kickoff - 20 minutes.
  - `kickoff_check`: kickoff + 5 minutes.
  - `halftime`: kickoff + 50 minutes.
  - `fulltime`: kickoff + 115 minutes.
  - `final_backup`: kickoff + 135 minutes.
- Adaptive milestones:
  - `live_watch`: every 15 minutes only after a provider response says a fixture is live, paused, in extra time, or in penalties.
  - `late_settlement`: every 30 minutes only when a match is not final after the normal settlement window or is delayed/suspended.
- Budget guard: low-priority `live_watch` calls are postponed when the configured daily reserve would be crossed. Settlement checks still run.

The scheduler wakes every 5 minutes, but a wakeup does not necessarily call football-data.org. It first asks the Nuxt cron endpoint whether the fixture schedule is stale or a milestone is due. If the schedule is fresh and nothing is due, the run records zero third-party requests.

Future knockout fixtures can arrive before either participant is decided. Those fixtures are cached with `TBD` display names and null provider IDs/slugs so later matches are not dropped from the same response. A failed daily schedule refresh retries after a one-hour cooldown instead of being treated as fresh or retrying every five minutes.

## Request Math

The smart sync groups due fixture milestones by UTC match date. If four fixtures from the same date are due at the same scheduler wakeup, the app can refresh that date with one `/competitions/WC/matches?season=2026&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` request. The default local budget is 100 requests per UTC day with 10 requests reserved for settlement checks.

Example budget:

| Usage | Estimated requests |
|---|---:|
| Team mapping refresh | 1/request only when no local football-data.org IDs exist |
| Fixture schedule refresh | 1/day when stale |
| One match with base milestones | 5/day worst case |
| Live watch during a long match | 0-6/day depending on provider status and budget reserve |
| Four same-day fixtures with grouped milestones | 5/day best case before adaptive live checks |
| Manual daily bootstrap | 3/request burst |

Keep manual admin `daily`, `all`, and `live` syncs for setup, admin repair, and testing. Use smart sync as the only production scheduled fixture and score refresh path.

## Production Setup

1. Rotate any key pasted into chat or logs.
2. Set the rotated API key as `FOOTBALL_DATA_KEY` for the Pages app.
3. Set a long random `FOOTBALL_DATA_CRON_SECRET` for both the Pages app and scheduler Worker.
4. Set `NIMIQ_POOLS_BASE_URL` on the scheduler Worker to the deployed Pages app origin.
5. Deploy the Pages app and scheduler Worker:

```bash
npm run deploy:cloudflare
npm run deploy:scheduler
```

6. Apply the D1 migration:

```bash
npm run d1:migrate:remote
```

## Tracking

The admin Football Sync panel shows:

- API requests counted today from local sync logs.
- Latest `X-RequestsAvailable` value returned by football-data.org.
- Latest `X-RequestCounter-Reset` value returned by football-data.org.
- Upcoming milestone calls.
- Recent milestone attempts and failures.
- The `team_mapping` sync state for API team ID hydration.
- The `fixture_schedule` sync state for the daily fixture-cache refresh.

If logged requests climb unexpectedly or `X-RequestsAvailable` approaches zero, disable manual syncs and pause or remove the scheduler cron until the provider window resets.
