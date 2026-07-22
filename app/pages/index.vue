<template>
  <main class="page home-page">
    <PageHeader title="Create League" subtitle="Start a private prediction league and share it with your group" />

    <section class="home-flow" aria-label="Create a private league">
      <section class="home-board" aria-labelledby="home-title">
        <div class="home-copy">
          <p class="eyebrow">Friendly rivalry</p>
          <h2 id="home-title"><span>Predict</span> <span class="home-title-accent">Together</span></h2>
          <p>Create a private World Cup league, lock three picks, add Pick'em rounds, and reveal the table when the deadline passes.</p>
        </div>

        <div class="home-updates" aria-label="League updates">
          <p class="home-updates-kicker">League updates</p>
          <div class="home-update-row">
            <strong>Live</strong>
            <span>
              <b>Rankings refresh</b>
              <small>Table movement appears as scores land.</small>
            </span>
          </div>
          <div class="home-update-row">
            <strong>Score</strong>
            <span>
              <b>Result sync</b>
              <small>Final scores update the league hub.</small>
            </span>
          </div>
          <div class="home-update-row">
            <strong>Pick'em</strong>
            <span>
              <b>Knockout Pick'em</b>
              <small>Choose the round where winner picks open.</small>
            </span>
          </div>
          <div class="home-update-row">
            <strong>Invite</strong>
            <span>
              <b>New entries</b>
              <small>Players appear as they join your league.</small>
            </span>
          </div>
        </div>
      </section>

      <PoolCreateForm />
    </section>
  </main>
</template>

<style scoped>
.home-page {
  align-content: start;
  gap: 0;
  position: relative;
}

.home-page::before {
  background:
    linear-gradient(180deg, transparent 0 38%, rgba(244, 176, 0, 0.08) 39% 42%, transparent 43%),
    linear-gradient(118deg, rgba(255, 246, 223, 0.72) 0 47%, rgba(255, 246, 223, 0.14) 47% 61%, transparent 61%),
    linear-gradient(180deg, rgba(255, 246, 223, 0.38) 0 32%, rgba(246, 231, 196, 0.2) 43%, rgba(14, 83, 25, 0.2) 100%);
  content: "";
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: -1;
}

.home-flow {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  display: grid;
  gap: 0;
  overflow: visible;
  position: relative;
}

.home-flow::after {
  background:
    linear-gradient(180deg, transparent 0 12%, rgba(17, 86, 27, 0.1) 58%, rgba(17, 86, 27, 0.22) 100%),
    repeating-linear-gradient(92deg, rgba(21, 91, 29, 0.1) 0 0.13rem, transparent 0.13rem 1.35rem);
  bottom: 0;
  content: "";
  height: 17rem;
  left: 0;
  pointer-events: none;
  position: absolute;
  right: 0;
  z-index: 0;
}

.home-board {
  background: transparent;
  border: 0;
  border-radius: 0;
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 24rem);
  min-height: 20rem;
  padding: 1.25rem 0 0.7rem;
  position: relative;
  overflow: visible;
  z-index: 1;
}

.home-copy {
  align-content: center;
  display: grid;
  gap: 0.35rem;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.home-copy h2,
.home-copy p {
  margin: 0;
}

.home-copy h2 {
  color: #14120e;
  font-size: clamp(3rem, 8vw, 6.8rem);
  font-style: italic;
  font-weight: 950;
  line-height: 0.92;
  max-width: 9ch;
  text-transform: uppercase;
}

.home-copy h2 span {
  color: #14120e;
  display: block;
}

.home-title-accent {
  color: var(--red);
}

.home-copy p:not(.eyebrow) {
  color: var(--muted);
  font-size: 1.05rem;
  font-weight: 850;
  max-width: min(100%, 42rem);
  overflow-wrap: anywhere;
}

.home-updates {
  align-content: start;
  display: grid;
  gap: 0.45rem;
  position: relative;
  z-index: 1;
}

.home-updates-kicker {
  color: var(--red);
  font-size: 0.75rem;
  font-weight: 950;
  letter-spacing: 0.06em;
  margin: 0 0 0.15rem;
  text-transform: uppercase;
}

.home-update-row {
  align-items: start;
  background: rgba(255, 250, 240, 0.42);
  border: 1px solid rgba(22, 21, 17, 0.12);
  border-radius: 0;
  color: var(--text);
  display: grid;
  gap: 0.72rem;
  grid-template-columns: 4.15rem minmax(0, 1fr);
  padding: 0.68rem 0.75rem;
}

.home-update-row strong {
  background: var(--accent);
  border-radius: 999px;
  color: #fff8e8;
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 950;
  justify-content: center;
  min-height: 1.65rem;
  padding: 0.32rem 0.55rem;
  text-transform: uppercase;
}

.home-update-row span {
  display: grid;
  gap: 0.08rem;
  min-width: 0;
}

.home-update-row b {
  color: #111814;
  font-size: 0.94rem;
  font-weight: 950;
}

.home-update-row small {
  color: #534d3e;
  font-size: 0.84rem;
  font-weight: 780;
  line-height: 1.25;
}

.home-update-row:nth-of-type(2) strong {
  background: var(--gold);
  color: #201504;
}

.home-update-row:nth-of-type(3) strong {
  background: var(--orange);
}

.home-update-row:nth-of-type(4) strong {
  background: var(--red);
}

@media (max-width: 780px) {
  .home-board {
    grid-template-columns: 1fr;
    padding: 0.85rem 0 0.35rem;
  }

  .home-copy h2 {
    font-size: clamp(2rem, 10vw, 3rem);
    max-width: 100%;
  }
}

@media (max-width: 520px) {
  .home-board {
    min-height: auto;
  }

  .home-copy p:not(.eyebrow) {
    font-size: 0.98rem;
  }
}
</style>
