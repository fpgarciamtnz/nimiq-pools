<script setup lang="ts">
import { ShieldCheck, Trophy, WalletCards } from '@lucide/vue'
import { onMounted, shallowRef } from 'vue'

const route = useRoute()
const auth = useWalletAuth()
const nimiq = useNimiqPay()
const isConnecting = shallowRef(false)
const error = shallowRef('')

onMounted(() => void nimiq.detectProvider())

async function connect() {
  error.value = ''
  isConnecting.value = true
  try {
    await auth.loginWithNimiqPay()
    const redirect = String(route.query.redirect ?? '/')
    await navigateTo(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Nimiq Pay could not be connected.'
  } finally {
    isConnecting.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card" aria-labelledby="login-title">
      <div class="login-mark" aria-hidden="true"><Trophy :size="28" /></div>
      <p class="eyebrow">Pick Party</p>
      <h1 id="login-title">Connect to join the game</h1>
      <p class="login-intro">Use your Nimiq Pay wallet to keep your leagues and predictions with you.</p>

      <div class="login-benefits">
        <span><ShieldCheck :size="18" aria-hidden="true" /> You approve a sign-in message. No payment is made.</span>
        <span><WalletCards :size="18" aria-hidden="true" /> Your leagues follow your wallet, not this browser.</span>
      </div>

      <button class="nimiq-button" type="button" :disabled="isConnecting || nimiq.detecting.value" @click="connect">
        <WalletCards :size="20" aria-hidden="true" />
        {{ isConnecting ? 'Waiting for approval…' : 'Connect Nimiq Pay' }}
      </button>

      <p v-if="!nimiq.available.value && !nimiq.detecting.value" class="provider-note">
        Open Pick Party inside Nimiq Pay to continue.
      </p>
      <p v-if="error" class="status error" role="alert">{{ error }}</p>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  display: grid;
  justify-items: center;
  width: 100%;
}

.login-card {
  background: rgba(255, 246, 223, 0.94);
  border: 1px solid rgba(22, 21, 17, 0.14);
  box-shadow: var(--shadow-lift);
  display: grid;
  gap: 0.9rem;
  max-width: 31rem;
  padding: clamp(1.35rem, 5vw, 2.5rem);
  width: 100%;
}

.login-mark {
  align-items: center;
  background: linear-gradient(135deg, var(--accent), var(--gold));
  border-radius: var(--radius);
  color: white;
  display: inline-flex;
  height: 3.5rem;
  justify-content: center;
  width: 3.5rem;
}

.login-card h1,
.login-card p { margin: 0; }
.login-card h1 { font-size: clamp(2rem, 8vw, 3.2rem); font-style: italic; line-height: 0.98; text-transform: uppercase; }
.login-intro { color: var(--muted); font-weight: 760; line-height: 1.5; }
.login-benefits { border-block: 1px solid var(--line); display: grid; gap: 0.65rem; padding: 1rem 0; }
.login-benefits span { align-items: flex-start; display: flex; font-size: 0.9rem; font-weight: 800; gap: 0.55rem; line-height: 1.35; }
.login-benefits svg { color: var(--accent); flex: 0 0 auto; }
.nimiq-button { background: #1f2348; color: white; min-height: 3.2rem; width: 100%; }
.nimiq-button:hover:not(:disabled) { background: #343a78; }
.provider-note { color: var(--muted); font-size: 0.86rem; font-weight: 760; text-align: center; }
</style>
