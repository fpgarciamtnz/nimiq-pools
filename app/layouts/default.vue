<template>
  <div class="navigation-shell">
    <AppSidebar />
    <div class="navigation-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.navigation-shell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  min-height: 100vh;
  width: 100%;
}

.navigation-content {
  min-width: 0;
  overflow-x: hidden;
}

@media (max-width: 860px) {
  .navigation-shell {
    display: block;
  }

  .navigation-content {
    padding-top: 4.75rem;
  }
}
</style>
