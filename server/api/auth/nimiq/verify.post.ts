import { z } from 'zod'
import { verifyNimiqChallenge } from '../../../utils/nimiq-auth'

const bodySchema = z.object({
  nonceId: z.string().uuid(),
  address: z.string().trim().min(36).max(44),
  publicKeyHex: z.string().regex(/^[0-9a-fA-F]{64}$/),
  signatureHex: z.string().regex(/^[0-9a-fA-F]{128}$/),
  rememberMe: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, (value) => bodySchema.parse(value))
  return { user: await verifyNimiqChallenge(event, body) }
})
