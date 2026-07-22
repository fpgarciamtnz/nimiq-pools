<script setup lang="ts">
import type { LeaderboardRow } from '../../shared/types'

interface Props {
  rows: LeaderboardRow[]
}

const props = defineProps<Props>()

function breakdownTitle(row: LeaderboardRow) {
  return row.breakdown.map((item) => `${item.label}: ${item.prediction} - ${item.status}`).join('\n')
}
</script>

<template>
  <section class="panel">
    <h2>Leaderboard</h2>
    <p v-if="props.rows.length === 0" class="muted">No ranked entries yet.</p>
    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Score</th>
            <th>Pick scores</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in props.rows" :key="row.entryId">
            <td>{{ row.rank }}</td>
            <td>{{ row.displayName }}</td>
            <td>{{ row.totalScore }}</td>
            <td :title="breakdownTitle(row)">
              <div class="score-breakdown">
                <span v-for="item in row.breakdown" :key="item.questionKey" class="score-chip">
                  <strong>{{ item.label }}</strong>
                  {{ item.points }}/{{ item.maxPoints }}
                  <span class="muted">- {{ item.result ?? item.status }}</span>
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.score-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.score-chip {
  background: var(--panel-soft);
  border: 1px solid var(--line);
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.82rem;
  gap: 0.25rem;
  line-height: 1.2;
  padding: 0.3rem 0.55rem;
  white-space: nowrap;
}
</style>
