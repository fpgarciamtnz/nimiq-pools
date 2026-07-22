import { readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  vite: {
    server: {
      fs: {
        allow: [resolve('.'), 'C:/tmp/NimiqPools-deps']
      }
    }
  },
  nitro: {
    rollupConfig: {
      plugins: [prismaWasmModuleLoader()]
    },
    esbuild: {
      options: {
        target: 'es2022'
      }
    }
  },
  runtimeConfig: {
    adminPin: process.env.NUXT_ADMIN_PIN || 'change-me',
    footballData: {
      key: process.env.FOOTBALL_DATA_KEY || '',
      baseUrl: process.env.FOOTBALL_DATA_BASE_URL || 'https://api.football-data.org/v4',
      competitionCode: process.env.FOOTBALL_DATA_COMPETITION_CODE || 'WC',
      season: Number(process.env.FOOTBALL_DATA_SEASON || 2026),
      cronSecret: process.env.FOOTBALL_DATA_CRON_SECRET || '',
      dailyLimit: Number(process.env.FOOTBALL_DATA_DAILY_LIMIT || 100),
      dailyReserve: Number(process.env.FOOTBALL_DATA_DAILY_RESERVE || 10)
    }
  }
})

function prismaWasmModuleLoader() {
  const wasmModules = new Map<string, string>()

  return {
    name: 'prisma-wasm-module-loader',
    resolveId(id: string, importer?: string) {
      if (!id.endsWith('.wasm?module')) {
        return null
      }

      const wasmPath = resolve(importer ? dirname(importer) : '.', id.slice(0, -'?module'.length))
      const fileName = basename(wasmPath)
      wasmModules.set(fileName, wasmPath)

      return {
        id: `./${fileName}`,
        external: true
      }
    },
    load(id: string) {
      if (id.endsWith('query_compiler_fast_bg.sqlite.wasm-base64.mjs')) {
        const source = readFileSync(id, 'utf8')
        const match = source.match(/(?:export\s+)?const\s+wasm\s*=\s*"([^"]+)"/)

        if (!match) {
          throw new Error(`Unable to parse Prisma WASM base64 module: ${id}`)
        }

        return `export const wasm = ${chunkedStringExpression(match[1])}`
      }

      return null
    },
    generateBundle() {
      for (const [fileName, wasmPath] of wasmModules) {
        this.emitFile({
          type: 'asset',
          fileName: `chunks/_/${fileName}`,
          source: readFileSync(wasmPath)
        })
      }
    }
  }
}

function chunkedStringExpression(value: string) {
  const chunkSize = 16_384
  const chunks = []

  for (let index = 0; index < value.length; index += chunkSize) {
    chunks.push(JSON.stringify(value.slice(index, index + chunkSize)))
  }

  return `[${chunks.join(',')}].join('')`
}
