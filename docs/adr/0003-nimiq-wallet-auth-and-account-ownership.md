# ADR 0003: Nimiq Wallet Authentication and Account Ownership

## Status

Accepted

## Context

Browser-local league codes and display names cannot establish who owns a league or prediction. They also disappear across browsers and allow anyone with an invite link to select and edit another participant's entry.

Nimiq Pay mini apps expose an injected `window.nimiq` provider that can list the active account and approve a signed message without creating a payment transaction.

## Decision

The app requires a Nimiq Pay login before entering user-facing routes.

- The server issues a short-lived, single-use challenge containing the request origin, challenge ID, nonce, and timestamps.
- Nimiq Pay signs the challenge using its injected provider.
- The server derives the Nimiq address from the submitted public key and verifies the Ed25519 signature over the Nimiq signed-message envelope.
- A successful login creates a database user and a random session. Only the session-token hash is stored; the raw token is kept in an HTTP-only, SameSite cookie.
- Pool creation records the authenticated wallet as owner and member.
- Prediction and Pick'em writes resolve the entry by pool and authenticated user. Client-provided entry identity cannot authorize an edit.
- Pool summaries come from account memberships rather than browser storage.
- Existing anonymous prediction rows remain readable after reveal but have no wallet owner until a migration or product decision assigns one.

This ADR does not add payment requests, custody, or paid/unpaid tracking.

## Consequences

Users can recover their leagues and predictions anywhere they connect the same wallet. Each wallet has at most one prediction entry per league, and private pre-reveal entries are scoped to that wallet.

The deployment must apply `20260721130000_nimiq_wallet_auth_and_ownership`. Login depends on the Nimiq Pay mini-app provider being injected; outside that host, the UI tells the user to open Pick Party inside Nimiq Pay.

Authentication is verified with unit vectors, API and component tests, a production build, and the simulator-backed `npm run test:nimiq-login` contract test.
