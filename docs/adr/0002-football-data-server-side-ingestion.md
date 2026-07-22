# ADR 0002: Add Server-Side football-data.org Ingestion

## Status

Accepted

## Context

The pool originally deferred external sports data. The next iteration needs cached live scores and automatic World Cup result updates without exposing football-data.org credentials or tying page traffic to third-party request quotas.

## Decision

football-data.org integration is server-side only. The app stores API team IDs, fixtures, standings, sync logs, and sync status locally. Browser clients read cached local endpoints.

Cached fixtures are the canonical scoring input for the beta leaderboard. The app derives team points from finished fixtures as 3 points per win, 1 per draw, and non-shootout goals for. Goals against are shown in score breakdowns but do not remove points. If a knockout match reaches penalties, only the shootout winner receives the 3 win points. Standings are cached for group-table views and Pick'em scoring.

## Consequences

The MVP can run daily or hourly syncs with predictable request volume. Live scores can refresh locally every minute while the server controls third-party polling. Rankings update from cached completed fixtures rather than from browser-side API calls.
