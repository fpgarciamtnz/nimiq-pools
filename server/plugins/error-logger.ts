export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    const path = event?.path ?? 'unknown path'
    const detail = error instanceof Error ? error.stack || error.message : error

    console.error('[nitro:error]', path, detail)
  })
})
