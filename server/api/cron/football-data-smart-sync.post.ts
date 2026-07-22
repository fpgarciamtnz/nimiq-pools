export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusText: 'Tournament sync is disabled because the tournament has ended'
  })
})
