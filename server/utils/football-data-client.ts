export interface FootballDataRateLimit {
  dailyRemaining: string | null
  minuteLimit: string | null
  minuteRemaining: string | null
}

export interface FootballDataClientOptions {
  apiKey: string
  baseUrl: string
  fetchImpl?: typeof fetch
  retryDelayMs?: number
}

export interface FootballDataResult<T> {
  data: T
  rateLimit: FootballDataRateLimit
}

export class FootballDataError extends Error {
  status: number
  rateLimit: FootballDataRateLimit

  constructor(message: string, status: number, rateLimit: FootballDataRateLimit) {
    super(message)
    this.name = 'FootballDataError'
    this.status = status
    this.rateLimit = rateLimit
  }
}

export class FootballDataClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly retryDelayMs: number
  private requests = 0
  private lastRateLimit: FootballDataRateLimit = {
    dailyRemaining: null,
    minuteLimit: null,
    minuteRemaining: null
  }

  constructor(options: FootballDataClientOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis)
    this.retryDelayMs = options.retryDelayMs ?? 500
  }

  get requestCount() {
    return this.requests
  }

  get rateLimit() {
    return this.lastRateLimit
  }

  async get<T>(path: string, params: Record<string, string | number | boolean | undefined | null> = {}) {
    if (!this.apiKey) {
      throw new FootballDataError('FOOTBALL_DATA_KEY is not configured', 401, this.lastRateLimit)
    }

    const url = this.buildUrl(path, params)
    return this.request<T>(url, 0)
  }

  private async request<T>(url: string, attempt: number): Promise<FootballDataResult<T>> {
    this.requests += 1
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        'X-Auth-Token': this.apiKey
      }
    })
    const rateLimit = readRateLimit(response.headers)
    this.lastRateLimit = rateLimit

    if ((response.status === 499 || response.status >= 500) && attempt === 0) {
      await delay(this.retryDelayMs)
      return this.request<T>(url, attempt + 1)
    }

    if (!response.ok) {
      throw new FootballDataError(`football-data.org request failed with HTTP ${response.status}`, response.status, rateLimit)
    }

    return {
      data: await response.json() as T,
      rateLimit
    }
  }

  private buildUrl(path: string, params: Record<string, string | number | boolean | undefined | null>) {
    const url = new URL(`${this.baseUrl}/${path.replace(/^\//, '')}`)

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }

    return url.toString()
  }
}

function readRateLimit(headers: Headers): FootballDataRateLimit {
  return {
    dailyRemaining: headers.get('x-requestsavailable'),
    minuteLimit: null,
    minuteRemaining: headers.get('x-requestcounter-reset')
  }
}

function delay(ms: number) {
  if (ms <= 0) {
    return Promise.resolve()
  }

  return new Promise((resolve) => setTimeout(resolve, ms))
}
