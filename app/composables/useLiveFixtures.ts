import type { LiveFixtureDto } from '../../shared/types'

interface LiveFixturesResponse {
  fixtures: LiveFixtureDto[]
  generatedAt: string
}

interface UseLiveFixturesOptions {
  refreshMs?: number
}

export function useLiveFixtures(options: UseLiveFixturesOptions = {}) {
  const refreshMs = options.refreshMs ?? 60_000
  const fixtures = shallowRef<LiveFixtureDto[]>([])
  const generatedAt = shallowRef<string | null>(null)
  const pending = shallowRef(false)
  const error = shallowRef<string | null>(null)
  let timer: ReturnType<typeof setInterval> | null = null

  async function refresh() {
    pending.value = true
    error.value = null

    try {
      const response = await $fetch<LiveFixturesResponse>('/api/live-fixtures')
      fixtures.value = response.fixtures
      generatedAt.value = response.generatedAt
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Live scores are unavailable.'
    } finally {
      pending.value = false
    }
  }

  onMounted(() => {
    void refresh()
    timer = setInterval(() => {
      void refresh()
    }, refreshMs)
  })

  onBeforeUnmount(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  })

  return {
    fixtures: readonly(fixtures),
    generatedAt: readonly(generatedAt),
    pending: readonly(pending),
    error: readonly(error),
    refresh
  }
}
