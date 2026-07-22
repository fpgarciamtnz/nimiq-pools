export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useWalletAuth()
  await auth.loadSession()

  if (to.path === '/login') {
    if (auth.loggedIn.value) return navigateTo(safeRedirect(String(to.query.redirect ?? '/')))
    return
  }

  if (!auth.loggedIn.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})

function safeRedirect(value: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
