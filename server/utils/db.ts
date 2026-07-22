import { PrismaD1 } from '@prisma/adapter-d1'
import type { H3Event } from 'h3'
import type { PrismaClient } from '~~/app/generated/prisma-node/client.ts'

export type AppPrisma = PrismaClient

const globalForPrisma = globalThis as unknown as {
  prisma?: Promise<AppPrisma>
  __dirname?: string
}

const d1Clients = new WeakMap<object, AppPrisma>()

export async function getPrisma(event?: H3Event) {
  const d1 = getD1Binding(event)

  if (d1) {
    const existing = d1Clients.get(d1)

    if (existing) {
      return existing
    }

    const PrismaClient = await getCloudflarePrismaClient()
    const prisma = new PrismaClient({ adapter: new PrismaD1(d1 as never) }) as AppPrisma
    d1Clients.set(d1, prisma)
    return prisma
  }

  globalForPrisma.prisma ??= createLocalPrisma()
  return globalForPrisma.prisma
}

async function getCloudflarePrismaClient() {
  globalForPrisma.__dirname ??= '/'
  const { PrismaClient } = await import('~~/app/generated/prisma/client.ts')
  return PrismaClient
}

async function createLocalPrisma() {
  const localAdapterPackage = '@prisma/adapter-better-sqlite3'
  const { PrismaBetterSqlite3 } = await import(/* @vite-ignore */ localAdapterPackage)
  const { PrismaClient: LocalPrismaClient } = await import('../../app/generated/prisma-node/client.ts')
  const adapter = new PrismaBetterSqlite3(
    {
      url: getLocalDatabaseUrl()
    },
    {
      timestampFormat: 'unixepoch-ms'
    }
  )

  return new LocalPrismaClient({ adapter }) as AppPrisma
}

function getLocalDatabaseUrl() {
  const url = process.env.DATABASE_URL || 'file:./dev.db'

  if (url === 'file:./dev.db') {
    return 'file:./prisma/dev.db'
  }

  return url
}

function getD1Binding(event?: H3Event) {
  return (event?.context as { cloudflare?: { env?: { DB?: object } } } | undefined)?.cloudflare?.env?.DB
}
