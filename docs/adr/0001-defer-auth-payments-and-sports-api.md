# ADR 0001: Defer Auth, Payments, and Sports API Integration

## Status

Superseded by [ADR 0003](0003-nimiq-wallet-auth-and-account-ownership.md)

## Context

Pick Party is a friend-run prediction pool inside a Nimiq-related workspace, but the MVP goal is simple pre-tournament participation by invite link. Participants identify themselves with a name or apodo, and payments are coordinated outside the app.

## Decision

The MVP does not include Nimiq auth, in-app payments, paid/unpaid tracking, or an external football data provider.

The app uses:

- Pool invite links for participation.
- Browser-local entry state for pre-deadline edits.
- Manual admin entry of global team finish stages.
- Server-side scoring from fixed objective rules.

## Consequences

This keeps the first version small and testable. It also means there is no cross-device account recovery, no payment custody, and no automatic tournament data ingestion. A future sports API can write into the same team result records used by manual admin entry.
