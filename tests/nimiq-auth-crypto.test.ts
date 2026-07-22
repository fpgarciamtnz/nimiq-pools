import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { blake2b256, deriveNimiqAddress, nimiqSignedMessageHash } from '../server/utils/nimiq-auth'

function bytesToHex(value: Uint8Array) {
  return Buffer.from(value).toString('hex')
}

describe('Nimiq authentication cryptography', () => {
  it('matches the standard BLAKE2b-256 empty-input vector', () => {
    expect(bytesToHex(blake2b256(new Uint8Array()))).toBe(
      '0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8'
    )
  })

  it('derives the simulator wallet address from its public key', () => {
    const publicKey = Uint8Array.from(Buffer.from(
      '378837b6646a2355956e0f3462680dac5de82265ed4d263062080f55ba803f30',
      'hex'
    ))

    expect(deriveNimiqAddress(publicKey)).toBe('NQ22 37NR SKL6 S7K4 UVC6 QU2Y NBCG 24U0 3XDP')
  })

  it('hashes the exact Nimiq signed-message envelope', async () => {
    const message = 'Pick Party requests Nimiq approval'
    const body = Buffer.from(message)
    const expected = createHash('sha256')
      .update(Buffer.concat([Buffer.from(`\u0016Nimiq Signed Message:\n${body.byteLength}`), body]))
      .digest('hex')

    expect(bytesToHex(await nimiqSignedMessageHash(message))).toBe(expected)
  })
})
