import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { deriveNimiqAddress } from '../server/utils/nimiq-auth'
import { getPrisma } from '../server/utils/db'

const baseUrl = process.env.PICK_PARTY_URL || 'http://127.0.0.1:3000'
const simulatorPath = process.env.NIMIQ_SIMULATOR_PATH
  || resolve('..', 'Nimiq-Simulator')
const signerModuleUrl = pathToFileURL(resolve(simulatorPath, 'packages/better-nimiq/src/index.ts')).href
const { signNimiqMessage } = await import(signerModuleUrl) as {
  signNimiqMessage(input: { message: string; privateKeyHex: string }): {
    address: string
    publicKeyHex: string
    signatureHex: string
  }
}

const prisma = await getPrisma()
const originalConfig = await prisma.gameConfig.findUnique({ where: { id: 1 } })
let poolCode = ''
const publicKeys: string[] = []

try {
  await prisma.gameConfig.update({
    where: { id: 1 },
    data: { predictionDeadline: new Date(Date.now() + 60 * 60 * 1000) }
  })

  const first = await loginWallet(randomBytes(32).toString('hex'))
  const second = await loginWallet(randomBytes(32).toString('hex'))
  publicKeys.push(first.publicKeyHex, second.publicKeyHex)

  const firstSession = await requestJson<{ user: { address: string } | null }>('/api/auth/session', {
    cookie: first.cookie
  })
  assert.equal(firstSession.user?.address, first.address, 'the session must resolve the signing wallet')

  const created = await requestJson<{ pool: { code: string }; inviteUrl: string }>('/api/pools', {
    method: 'POST',
    cookie: first.cookie,
    body: { title: `Wallet test ${Date.now()}`, competitionMode: 'ballot_only' }
  })
  poolCode = created.pool.code
  assert.equal(created.inviteUrl, `/invite/${poolCode}`)

  const game = await requestJson<{ teams: Array<{ slug: string }> }>('/api/game')
  assert.ok(game.teams.length >= 4, 'seeded teams are required for prediction verification')
  const answers = ['team_1', 'team_2', 'team_3', 'team_4'].map((questionKey, index) => ({
    questionKey,
    teamSlug: game.teams[index].slug
  }))
  const saved = await requestJson<{ entry: { id: string; displayName: string } }>('/api/predictions', {
    method: 'POST',
    cookie: first.cookie,
    body: { poolCode, displayName: 'Wallet One', answers }
  })
  assert.equal(saved.entry.displayName, 'Wallet One')

  const firstState = await requestJson<{ entries: unknown[]; editableEntries: Array<{ id: string }> }>(`/api/pools/${poolCode}`, {
    cookie: first.cookie
  })
  assert.equal(firstState.entries.length, 0, 'other predictions stay hidden before reveal')
  assert.deepEqual(firstState.editableEntries.map(({ id }) => id), [saved.entry.id])

  const secondState = await requestJson<{ editableEntries: unknown[] }>(`/api/pools/${poolCode}`, {
    cookie: second.cookie
  })
  assert.equal(secondState.editableEntries.length, 0, 'a second wallet must not receive the first wallet entry')

  const forbidden = await fetch(`${baseUrl}/api/predictions/${saved.entry.id}`, {
    method: 'PUT',
    headers: requestHeaders(second.cookie),
    body: JSON.stringify({ poolCode, displayName: 'Wallet Two', answers })
  })
  assert.equal(forbidden.status, 403, 'a second wallet must not edit the first wallet entry')

  const secondLeaguesBeforeJoining = await requestJson<{ pools: Array<{ code: string }> }>('/api/pools/summaries', {
    cookie: second.cookie
  })
  assert.ok(
    !secondLeaguesBeforeJoining.pools.some((pool) => pool.code === poolCode),
    'viewing an invite must not silently claim league membership'
  )

  const secondSaved = await requestJson<{ entry: { id: string; displayName: string } }>('/api/predictions', {
    method: 'POST',
    cookie: second.cookie,
    body: { poolCode, displayName: 'Wallet Two', answers }
  })
  assert.notEqual(secondSaved.entry.id, saved.entry.id, 'each wallet must receive its own prediction entry')

  const secondOwnedState = await requestJson<{ entries: unknown[]; editableEntries: Array<{ id: string }> }>(`/api/pools/${poolCode}`, {
    cookie: second.cookie
  })
  assert.equal(secondOwnedState.entries.length, 0, 'other predictions must remain hidden before reveal')
  assert.deepEqual(
    secondOwnedState.editableEntries.map(({ id }) => id),
    [secondSaved.entry.id],
    'the participating wallet must receive only its own editable entry'
  )

  const firstLeagues = await requestJson<{ pools: Array<{ code: string }> }>('/api/pools/summaries', {
    cookie: first.cookie
  })
  const secondLeagues = await requestJson<{ pools: Array<{ code: string }> }>('/api/pools/summaries', {
    cookie: second.cookie
  })
  assert.ok(firstLeagues.pools.some((pool) => pool.code === poolCode), 'the owner league must follow the first wallet')
  assert.ok(secondLeagues.pools.some((pool) => pool.code === poolCode), 'a joined league must follow the participating wallet')

  console.log(JSON.stringify({
    challengeVerified: true,
    sessionVerified: true,
    leagueOwnershipVerified: true,
    predictionIsolationVerified: true
  }))
} finally {
  if (poolCode) await prisma.pool.deleteMany({ where: { code: poolCode } })
  if (publicKeys.length) await prisma.user.deleteMany({ where: { publicKey: { in: publicKeys } } })
  if (originalConfig) {
    await prisma.gameConfig.update({
      where: { id: 1 },
      data: { predictionDeadline: originalConfig.predictionDeadline }
    })
  }
  await prisma.$disconnect()
}

async function loginWallet(privateKeyHex: string) {
  const nonce = await requestJson<{ nonceId: string; message: string }>('/api/auth/nimiq/nonce', {
    method: 'POST', body: {}
  })
  const proof = signNimiqMessage({ message: nonce.message, privateKeyHex })
  const derivedAddress = deriveNimiqAddress(hexToBytes(proof.publicKeyHex))
  assert.equal(derivedAddress, proof.address, 'app and simulator address derivation must match')

  const response = await fetch(`${baseUrl}/api/auth/nimiq/verify`, {
    method: 'POST',
    headers: requestHeaders(),
    body: JSON.stringify({
      nonceId: nonce.nonceId,
      address: proof.address,
      publicKeyHex: proof.publicKeyHex,
      signatureHex: proof.signatureHex,
      rememberMe: true
    })
  })
  const payload = await response.json() as { user?: { address: string }; message?: string }
  assert.equal(response.status, 200, payload.message || 'wallet verification failed')
  assert.equal(payload.user?.address, proof.address)
  const cookie = (response.headers.getSetCookie?.()[0] || response.headers.get('set-cookie') || '').split(';')[0]
  assert.ok(cookie.startsWith('pick_party_session='), 'the server must issue an HTTP-only session cookie')
  return { ...proof, cookie }
}

async function requestJson<T>(path: string, options: {
  method?: string
  cookie?: string
  body?: unknown
} = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: requestHeaders(options.cookie),
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  })
  const payload = await response.json() as T & { message?: string }
  assert.ok(response.ok, payload.message || `${path} returned ${response.status}`)
  return payload
}

function requestHeaders(cookie?: string) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    origin: baseUrl
  }
  if (cookie) headers.cookie = cookie
  return headers
}

function hexToBytes(value: string) {
  return Uint8Array.from(value.match(/.{2}/g) || [], (byte) => Number.parseInt(byte, 16))
}
