<script setup lang="ts">
import {
  ArrowLeft,
  CircleHelp,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Trophy,
  UsersRound,
  WalletCards,
  X
} from '@lucide/vue'
import type { Component } from 'vue'
import type { PoolSummaryDto } from '../../shared/types'

interface NavigationItem {
  label: string
  description: string
  to: string
  icon: Component
}

const route = useRoute()
const router = useRouter()
const isCollapsed = shallowRef(false)
const isMobileOpen = shallowRef(false)
const { user, logout } = useWalletAuth()
const savedLeagueSummaries = shallowRef<PoolSummaryDto[]>([])

const primaryItems: NavigationItem[] = [
  { label: 'Create League', description: 'Start a new group', to: '/', icon: Home },
  { label: 'Your Leagues', description: 'Saved to your wallet', to: '/tournament', icon: UsersRound },
  { label: 'How it works', description: 'Rules and points', to: '/how-it-works', icon: CircleHelp }
]

const adminItem: NavigationItem = {
  label: 'Admin',
  description: 'Settings and results',
  to: '/admin',
  icon: Shield
}

const savedLeagueItems = computed(() => savedLeagueSummaries.value.map((pool) => ({
  code: pool.code,
  label: pool.title,
  to: `/invite/${pool.code}`,
  imageDataUrl: pool.imageDataUrl || ''
})))

watch(() => route.fullPath, () => {
  isMobileOpen.value = false
  void loadSavedLeagueSummaries()
})

onMounted(() => void loadSavedLeagueSummaries())

async function loadSavedLeagueSummaries() {
  try {
    const response = await $fetch<{ pools: PoolSummaryDto[] }>('/api/pools/summaries')
    savedLeagueSummaries.value = response.pools
  } catch {
    savedLeagueSummaries.value = []
  }
}

function shortAddress(address: string) {
  const compact = address.replace(/\s+/g, '')
  return `${compact.slice(0, 6)}…${compact.slice(-4)}`
}

function isActive(to: string) {
  return to === '/'
    ? route.path === '/'
    : route.path === to || route.path.startsWith(`${to}/`)
}

function goBack() {
  if (import.meta.client && window.history.length > 1) {
    router.back()
    return
  }

  void router.push('/tournament')
}

function closeMobileMenu() {
  isMobileOpen.value = false
}
</script>

<template>
  <button class="mobile-menu-button" type="button" :aria-expanded="isMobileOpen" aria-controls="app-navigation" @click="isMobileOpen = true">
    <Menu :size="18" aria-hidden="true" />
    <span>Menu</span>
  </button>

  <div v-if="isMobileOpen" class="mobile-nav-backdrop" aria-hidden="true" @click="closeMobileMenu" />

  <aside id="app-navigation" class="app-sidebar" :class="{ 'is-collapsed': isCollapsed, 'is-mobile-open': isMobileOpen }" aria-label="App navigation">
    <div class="sidebar-header">
      <NuxtLink class="sidebar-brand" to="/" aria-label="Pick Party home">
        <Trophy :size="18" aria-hidden="true" />
        <span class="sidebar-text">Pick Party</span>
      </NuxtLink>

      <button class="icon-button mobile-close" type="button" aria-label="Close navigation" @click="closeMobileMenu">
        <X :size="18" aria-hidden="true" />
      </button>
    </div>

    <button class="nav-action" type="button" @click="goBack">
      <ArrowLeft :size="17" aria-hidden="true" />
      <span class="sidebar-text">Back</span>
    </button>

    <nav class="sidebar-nav" aria-label="Primary navigation">
      <NuxtLink
        v-for="item in primaryItems"
        :key="item.to"
        class="sidebar-link"
        :class="{ 'is-active': isActive(item.to) }"
        :to="item.to"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <component :is="item.icon" :size="17" aria-hidden="true" />
        <span class="sidebar-text link-copy">
          <span>{{ item.label }}</span>
          <small>{{ item.description }}</small>
        </span>
      </NuxtLink>
    </nav>

    <section class="saved-leagues" aria-labelledby="saved-leagues-title">
      <div class="sidebar-section-heading">
        <LayoutDashboard :size="16" aria-hidden="true" />
        <span id="saved-leagues-title" class="sidebar-text">Your leagues</span>
      </div>

      <div v-if="savedLeagueItems.length" class="saved-league-list">
        <NuxtLink
          v-for="league in savedLeagueItems"
          :key="league.code"
          class="saved-league-link"
          :class="{ 'is-active': isActive(league.to) }"
          :to="league.to"
          :aria-current="isActive(league.to) ? 'page' : undefined"
        >
          <span class="league-avatar" aria-hidden="true">
            <img v-if="league.imageDataUrl" :src="league.imageDataUrl" alt="">
            <span v-else>{{ league.label.slice(0, 2).toUpperCase() }}</span>
          </span>
          <span class="sidebar-text">{{ league.label }}</span>
        </NuxtLink>
      </div>

      <p v-else class="empty-leagues sidebar-text">No account leagues yet.</p>
    </section>

    <nav class="sidebar-nav admin-nav" aria-label="Admin navigation">
      <NuxtLink class="sidebar-link" :class="{ 'is-active': isActive(adminItem.to) }" :to="adminItem.to" :aria-current="isActive(adminItem.to) ? 'page' : undefined">
        <Shield :size="17" aria-hidden="true" />
        <span class="sidebar-text link-copy">
          <span>{{ adminItem.label }}</span>
          <small>{{ adminItem.description }}</small>
        </span>
      </NuxtLink>
    </nav>

    <div v-if="user" class="wallet-account">
      <WalletCards :size="17" aria-hidden="true" />
      <span class="sidebar-text link-copy">
        <span>Nimiq Pay</span>
        <small>{{ shortAddress(user.address) }}</small>
      </span>
      <button class="wallet-logout" type="button" aria-label="Disconnect Nimiq Pay" @click="logout">
        <LogOut :size="16" aria-hidden="true" />
      </button>
    </div>

    <button class="collapse-toggle" type="button" :aria-expanded="!isCollapsed" @click="isCollapsed = !isCollapsed">
      <PanelLeftClose v-if="!isCollapsed" :size="17" aria-hidden="true" />
      <PanelLeftOpen v-else :size="17" aria-hidden="true" />
      <span class="sidebar-text">Collapse</span>
    </button>
  </aside>
</template>

<style scoped>
.mobile-menu-button {
  background: rgba(17, 24, 20, 0.94);
  border: 0;
  box-shadow: none;
  color: var(--text-invert);
  display: none;
  left: 0.75rem;
  position: fixed;
  top: 0.75rem;
  z-index: 30;
}

.mobile-nav-backdrop {
  background: rgba(2, 10, 19, 0.62);
  inset: 0;
  position: fixed;
  z-index: 35;
}

.app-sidebar {
  align-content: start;
  background: transparent;
  border-right: 0;
  display: grid;
  gap: 0.75rem;
  min-height: 100vh;
  padding: 0.75rem;
  position: sticky;
  top: 0;
  transition: width 160ms ease;
  width: 17.5rem;
  z-index: 40;
}

.app-sidebar.is-collapsed {
  width: 4.65rem;
}

.sidebar-header {
  align-items: center;
  display: flex;
  gap: 0.55rem;
  justify-content: space-between;
  min-width: 0;
}

.sidebar-brand,
.sidebar-link,
.saved-league-link,
.nav-action,
.collapse-toggle,
.sidebar-section-heading {
  align-items: center;
  display: flex;
  gap: 0.58rem;
  min-width: 0;
}

.sidebar-brand {
  color: var(--text);
  font-weight: 950;
  min-height: 2.6rem;
  text-decoration: none;
}

.sidebar-brand svg,
.sidebar-link svg,
.saved-league-link svg,
.nav-action svg,
.collapse-toggle svg,
.sidebar-section-heading svg {
  flex: 0 0 auto;
}

.sidebar-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-sidebar.is-collapsed .sidebar-text {
  border: 0;
  clip: rect(0, 0, 0, 0);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

.sidebar-nav,
.saved-league-list,
.saved-leagues {
  display: grid;
  gap: 0.38rem;
  min-width: 0;
}

.sidebar-link,
.saved-league-link,
.nav-action,
.collapse-toggle,
.icon-button {
  background: transparent;
  border: 1px solid transparent;
  color: rgba(22, 21, 17, 0.72);
  min-height: 2.55rem;
  text-decoration: none;
  width: 100%;
}

.sidebar-link,
.saved-league-link,
.nav-action,
.collapse-toggle {
  justify-content: flex-start;
  padding: 0.48rem 0.56rem;
}

.icon-button {
  justify-content: center;
  padding: 0;
  width: 2.45rem;
}

.mobile-close {
  display: none;
}

.sidebar-link:hover,
.sidebar-link.is-active,
.saved-league-link:hover,
.saved-league-link.is-active,
.nav-action:hover,
.collapse-toggle:hover {
  background: transparent;
  border-color: transparent;
  color: var(--accent-strong);
}

.link-copy {
  display: grid;
  gap: 0.08rem;
}

.link-copy span {
  font-weight: 850;
}

.link-copy small {
  color: rgba(22, 21, 17, 0.52);
  font-size: 0.75rem;
  font-weight: 760;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-section-heading {
  color: rgba(22, 21, 17, 0.58);
  font-size: 0.76rem;
  font-weight: 950;
  padding: 0.2rem 0.56rem;
  text-transform: uppercase;
}

.saved-leagues {
  border-top: 1px solid rgba(22, 21, 17, 0.12);
  padding-top: 0.75rem;
}

.saved-league-link {
  min-height: 2.8rem;
}

.league-avatar {
  align-items: center;
  background: linear-gradient(135deg, var(--accent), var(--gold));
  border: 1px solid rgba(255, 248, 232, 0.24);
  border-radius: var(--radius);
  color: var(--text-invert);
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 0.72rem;
  font-weight: 950;
  height: 2rem;
  justify-content: center;
  overflow: hidden;
  width: 2rem;
}

.league-avatar img {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.empty-leagues {
  color: rgba(22, 21, 17, 0.52);
  font-size: 0.86rem;
  font-weight: 760;
  margin: 0;
  padding: 0 0.56rem;
}

.admin-nav {
  border-top: 1px solid rgba(22, 21, 17, 0.12);
  padding-top: 0.75rem;
}

.collapse-toggle {
  margin-top: auto;
}

.wallet-account {
  align-items: center;
  border-top: 1px solid rgba(22, 21, 17, 0.12);
  display: grid;
  gap: 0.55rem;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 0.75rem 0.56rem 0;
}

.wallet-logout {
  background: transparent;
  color: rgba(22, 21, 17, 0.64);
  min-height: 2rem;
  padding: 0;
  width: 2rem;
}

@media (max-width: 860px) {
  .mobile-menu-button {
    display: inline-flex;
  }

  .app-sidebar {
    background: rgba(255, 246, 223, 0.96);
    bottom: 0;
    left: 0;
    max-width: calc(100vw - 1.5rem);
    position: fixed;
    top: 0;
    transform: translateX(-105%);
    transition: transform 180ms ease;
    width: min(20rem, calc(100vw - 1.5rem));
  }

  .app-sidebar.is-mobile-open {
    transform: translateX(0);
  }

  .app-sidebar.is-collapsed {
    width: min(20rem, calc(100vw - 1.5rem));
  }

  .app-sidebar.is-collapsed .sidebar-text {
    clip: auto;
    height: auto;
    margin: 0;
    overflow: hidden;
    position: static;
    width: auto;
  }

  .mobile-close {
    display: inline-flex;
  }

  .collapse-toggle {
    display: none;
  }
}
</style>
