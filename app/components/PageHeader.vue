<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
  eyebrow?: string
}

const props = withDefaults(defineProps<Props>(), {
  eyebrow: 'Pick Party',
  subtitle: ''
})
</script>

<template>
  <header class="page-header">
    <p class="eyebrow">{{ props.eyebrow }}</p>
    <div class="page-header-copy">
      <h1>{{ props.title }}</h1>
      <p v-if="props.subtitle">{{ props.subtitle }}</p>
    </div>
  </header>
</template>

<style scoped>
.page-header {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  display: grid;
  gap: 0.22rem;
  min-width: 0;
  padding: 0.35rem 0 0.1rem;
  overflow: hidden;
  width: 100%;
}

.page-header-copy {
  display: grid;
  gap: 0.22rem;
  min-width: 0;
}

.page-header h1,
.page-header p {
  margin: 0;
}

.page-header h1 {
  color: var(--text);
  font-size: clamp(1.75rem, 3vw, 2.6rem);
  line-height: 1;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.page-header-copy p {
  color: var(--muted);
  font-size: 0.98rem;
  font-weight: 760;
  max-width: 100%;
  overflow-wrap: anywhere;
  white-space: normal;
}

@media (max-width: 520px) {
  .page-header h1 {
    font-size: 1.75rem;
  }

  .page-header-copy p {
    font-size: 0.95rem;
  }
}
</style>
