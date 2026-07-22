import { issueNimiqChallenge } from '../../../utils/nimiq-auth'

export default defineEventHandler((event) => issueNimiqChallenge(event))
