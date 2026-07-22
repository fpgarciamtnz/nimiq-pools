<script setup lang="ts">
import { Menu, Trophy, X } from '@lucide/vue'

interface Props {
  title: string
  subtitle?: string
}

const props = defineProps<Props>()
const isMenuOpen = shallowRef(false)

const navItems = [
  { label: 'Create', to: '/' },
  { label: 'Leagues', to: '/tournament' },
  { label: 'Demo', to: '/invite/worldcup' },
  { label: 'Admin', to: '/admin' }
]
</script>

<template>
  <header class="app-topbar">
    <div class="brand">
      <NuxtLink class="brand-mark" to="/" aria-label="Pick Party home">
        <Trophy :size="22" aria-hidden="true" />
      </NuxtLink>
      <div class="brand-copy">
        <p class="eyebrow">Pick Party</p>
        <h1>{{ props.title }}</h1>
        <p v-if="props.subtitle">{{ props.subtitle }}</p>
      </div>
    </div>

    <nav class="nav nav-desktop" aria-label="Main navigation">
      <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to">{{ item.label }}</NuxtLink>
    </nav>

    <button class="menu-toggle" type="button" :aria-expanded="isMenuOpen" aria-controls="mobile-navigation" @click="isMenuOpen = !isMenuOpen">
      <Menu v-if="!isMenuOpen" :size="20" aria-hidden="true" />
      <X v-else :size="20" aria-hidden="true" />
      <span class="sr-only">Toggle navigation</span>
    </button>

    <nav v-if="isMenuOpen" id="mobile-navigation" class="nav nav-mobile" aria-label="Mobile navigation">
      <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to" @click="isMenuOpen = false">{{ item.label }}</NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
.app-topbar {
  align-items: center;
  background: rgba(255, 246, 223, 0.58);
  border: 0;
  border-radius: var(--radius);
  box-shadow: none;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 0.75rem;
}

.nav-desktop {
  display: flex;
}

.menu-toggle {
  background: rgba(17, 24, 20, 0.94);
  border: 0;
  color: var(--text);
  display: none;
  min-height: 2.5rem;
  padding: 0;
  width: 2.5rem;
}

.menu-toggle {
  color: var(--text-invert);
}

.nav-mobile {
  display: none;
  grid-column: 1 / -1;
}

@media (max-width: 760px) {
  .nav-desktop {
    display: none;
  }

  .menu-toggle,
  .nav-mobile {
    display: grid;
  }

  .nav-mobile {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 460px) {
  .nav-mobile {
    grid-template-columns: 1fr;
  }
}
</style>
