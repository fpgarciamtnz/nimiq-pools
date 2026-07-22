import { getGameState } from '../utils/game'

export default defineEventHandler(async (event) => {
  return getGameState(event)
})
