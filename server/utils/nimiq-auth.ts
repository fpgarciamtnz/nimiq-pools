import type { H3Event } from 'h3'
import { createError, deleteCookie, getCookie, getHeader, getRequestURL, setCookie } from 'h3'
import { getPrisma } from './db'
import type { AuthUserDto } from '../../shared/types'

const AUTH_COOKIE = 'pick_party_session'
const CHALLENGE_TTL_MS = 5 * 60 * 1000
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const NIMIQ_BASE32 = '0123456789ABCDEFGHJKLMNPQRSTUVXY'

interface AuthContext extends Record<string, unknown> {
  authUser?: AuthUserDto | null
}

export async function issueNimiqChallenge(event: H3Event) {
  assertSameOrigin(event)
  const prisma = await getPrisma(event)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS)
  const id = crypto.randomUUID()
  const nonce = randomHex(32)
  const origin = getRequestURL(event).origin
  const message = [
    'Pick Party requests Nimiq approval',
    'Action: auth.login',
    `Origin: ${origin}`,
    `Challenge ID: ${id}`,
    `Nonce: ${nonce}`,
    `Issued At: ${now.toISOString()}`,
    `Expires At: ${expiresAt.toISOString()}`
  ].join('\n')

  await prisma.authChallenge.deleteMany({ where: { expiresAt: { lte: now } } })
  await prisma.authChallenge.create({ data: { id, message, origin, expiresAt } })

  return {
    nonceId: id,
    message,
    expiresAt: expiresAt.toISOString()
  }
}

export async function verifyNimiqChallenge(event: H3Event, input: {
  nonceId: string
  address: string
  publicKeyHex: string
  signatureHex: string
  rememberMe?: boolean
}) {
  assertSameOrigin(event)
  const prisma = await getPrisma(event)
  const now = new Date()
  const challenge = await prisma.authChallenge.findUnique({ where: { id: input.nonceId } })

  if (!challenge || challenge.expiresAt <= now || challenge.origin !== getRequestURL(event).origin) {
    throw createError({ statusCode: 401, statusText: 'This sign-in request expired. Please try again.' })
  }

  const consumed = await prisma.authChallenge.deleteMany({
    where: { id: challenge.id, expiresAt: { gt: now } }
  })

  if (consumed.count !== 1) {
    throw createError({ statusCode: 401, statusText: 'This sign-in request was already used.' })
  }

  const publicKey = hexToBytes(input.publicKeyHex, 32, 'public key')
  const signature = hexToBytes(input.signatureHex, 64, 'signature')
  const address = deriveNimiqAddress(publicKey)

  if (normalizeNimiqAddress(input.address) !== normalizeNimiqAddress(address)) {
    throw createError({ statusCode: 401, statusText: 'The wallet address does not match its public key.' })
  }

  const messageHash = await nimiqSignedMessageHash(challenge.message)
  const verificationKey = await crypto.subtle.importKey(
    'raw',
    publicKey,
    { name: 'Ed25519' },
    false,
    ['verify']
  )
  const valid = await crypto.subtle.verify('Ed25519', verificationKey, signature, messageHash)

  if (!valid) {
    throw createError({ statusCode: 401, statusText: 'The wallet signature could not be verified.' })
  }

  const canonicalPublicKey = bytesToHex(publicKey)
  const user = await prisma.user.upsert({
    where: { publicKey: canonicalPublicKey },
    update: { address },
    create: { publicKey: canonicalPublicKey, address }
  })
  const token = randomHex(32)
  const tokenHash = await sha256Hex(token)
  const expiresAt = new Date(now.getTime() + (input.rememberMe === false ? 24 * 60 * 60 * 1000 : SESSION_TTL_MS))

  await prisma.session.deleteMany({ where: { expiresAt: { lte: now } } })
  await prisma.session.create({
    data: { tokenHash, userId: user.id, expiresAt }
  })
  setCookie(event, AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
  })

  return toAuthUser(user)
}

export async function getOptionalAuthUser(event: H3Event): Promise<AuthUserDto | null> {
  const context = event.context as AuthContext

  if (context.authUser !== undefined) {
    return context.authUser
  }

  const token = getCookie(event, AUTH_COOKIE)

  if (!token) {
    context.authUser = null
    return null
  }

  const prisma = await getPrisma(event)
  const tokenHash = await sha256Hex(token)
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true }
  })

  if (!session || session.expiresAt <= new Date()) {
    deleteCookie(event, AUTH_COOKIE, { path: '/' })
    if (session) {
      await prisma.session.delete({ where: { id: session.id } })
    }
    context.authUser = null
    return null
  }

  const now = new Date()
  if (now.getTime() - session.lastSeenAt.getTime() > 60 * 60 * 1000) {
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: now } })
  }

  context.authUser = toAuthUser(session.user)
  return context.authUser
}

export async function requireAuthUser(event: H3Event) {
  const user = await getOptionalAuthUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusText: 'Connect Nimiq Pay to continue.' })
  }

  return user
}

export async function clearAuthSession(event: H3Event) {
  assertSameOrigin(event)
  const token = getCookie(event, AUTH_COOKIE)
  deleteCookie(event, AUTH_COOKIE, { path: '/' })

  if (token) {
    const prisma = await getPrisma(event)
    await prisma.session.deleteMany({ where: { tokenHash: await sha256Hex(token) } })
  }
}

export function assertSameOrigin(event: H3Event) {
  const origin = getHeader(event, 'origin')

  if (origin && origin !== getRequestURL(event).origin) {
    throw createError({ statusCode: 403, statusText: 'Cross-site request rejected.' })
  }
}

export async function nimiqSignedMessageHash(message: string) {
  const messageBytes = new TextEncoder().encode(message)
  const prefix = new TextEncoder().encode(`\u0016Nimiq Signed Message:\n${messageBytes.byteLength}`)
  const payload = new Uint8Array(prefix.length + messageBytes.length)
  payload.set(prefix)
  payload.set(messageBytes, prefix.length)
  return new Uint8Array(await crypto.subtle.digest('SHA-256', payload))
}

export function deriveNimiqAddress(publicKey: Uint8Array) {
  if (publicKey.length !== 32) {
    throw new Error('A Nimiq public key must contain 32 bytes')
  }

  const addressBytes = blake2b256(publicKey).slice(0, 20)
  let value = 0
  let bits = 0
  let base32 = ''

  for (const byte of addressBytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      base32 += NIMIQ_BASE32[(value >>> bits) & 31]
      value &= (1 << bits) - 1
    }
  }

  const checksum = String(98 - ibanMod97(`${base32}232600`)).padStart(2, '0')
  return (`NQ${checksum}${base32}`).match(/.{1,4}/g)?.join(' ') ?? ''
}

export function blake2b256(input: Uint8Array) {
  const mask = 0xffffffffffffffffn
  const iv = [
    0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n,
    0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n
  ]
  const sigma = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
    [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
    [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
    [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
    [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
    [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
    [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
    [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
    [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3]
  ]
  const h = [...iv]
  h[0] ^= 0x01010020n
  const blocks = Math.max(1, Math.ceil(input.length / 128))

  for (let block = 0; block < blocks; block += 1) {
    const offset = block * 128
    const length = Math.min(128, input.length - offset)
    const bytes = new Uint8Array(128)
    if (length > 0) bytes.set(input.subarray(offset, offset + length))
    const m = Array.from({ length: 16 }, (_, word) => readUint64LE(bytes, word * 8))
    const v = [...h, ...iv]
    const total = BigInt(offset + Math.max(0, length))
    v[12] ^= total & mask
    v[13] ^= total >> 64n
    if (block === blocks - 1) v[14] ^= mask

    const rotate = (value: bigint, count: bigint) => ((value >> count) | (value << (64n - count))) & mask
    const g = (a: number, b: number, c: number, d: number, x: bigint, y: bigint) => {
      v[a] = (v[a] + v[b] + x) & mask
      v[d] = rotate(v[d] ^ v[a], 32n)
      v[c] = (v[c] + v[d]) & mask
      v[b] = rotate(v[b] ^ v[c], 24n)
      v[a] = (v[a] + v[b] + y) & mask
      v[d] = rotate(v[d] ^ v[a], 16n)
      v[c] = (v[c] + v[d]) & mask
      v[b] = rotate(v[b] ^ v[c], 63n)
    }

    for (let round = 0; round < 12; round += 1) {
      const s = sigma[round]
      g(0, 4, 8, 12, m[s[0]], m[s[1]])
      g(1, 5, 9, 13, m[s[2]], m[s[3]])
      g(2, 6, 10, 14, m[s[4]], m[s[5]])
      g(3, 7, 11, 15, m[s[6]], m[s[7]])
      g(0, 5, 10, 15, m[s[8]], m[s[9]])
      g(1, 6, 11, 12, m[s[10]], m[s[11]])
      g(2, 7, 8, 13, m[s[12]], m[s[13]])
      g(3, 4, 9, 14, m[s[14]], m[s[15]])
    }

    for (let index = 0; index < 8; index += 1) h[index] = h[index] ^ v[index] ^ v[index + 8]
  }

  const output = new Uint8Array(32)
  for (let word = 0; word < 4; word += 1) writeUint64LE(output, word * 8, h[word])
  return output
}

function toAuthUser(user: { id: string; address: string; publicKey: string }): AuthUserDto {
  return { id: user.id, address: user.address, publicKey: user.publicKey }
}

function normalizeNimiqAddress(address: string) {
  return address.replace(/\s+/g, '').toUpperCase()
}

function ibanMod97(value: string) {
  let remainder = 0
  for (const character of value) {
    const digits = /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder
}

function readUint64LE(bytes: Uint8Array, offset: number) {
  let value = 0n
  for (let index = 7; index >= 0; index -= 1) value = (value << 8n) | BigInt(bytes[offset + index])
  return value
}

function writeUint64LE(bytes: Uint8Array, offset: number, value: bigint) {
  for (let index = 0; index < 8; index += 1) {
    bytes[offset + index] = Number(value & 0xffn)
    value >>= 8n
  }
}

function hexToBytes(value: string, expectedLength: number, label: string) {
  if (!new RegExp(`^[0-9a-fA-F]{${expectedLength * 2}}$`).test(value)) {
    throw createError({ statusCode: 400, statusText: `Invalid Nimiq ${label}.` })
  }
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16))
}

function bytesToHex(value: Uint8Array) {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(value: string) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
}

function randomHex(length: number) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}
