<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    backTo?: string;
  }>(),
  {
    backTo: "/",
  },
);
</script>

<template>
  <main class="game-shell flex h-[100dvh] w-full flex-col overflow-hidden bg-dark text-white select-none overscroll-none">
    <!-- Barre supérieure compacte et immersive -->
    <header
      class="game-shell-header z-30 flex shrink-0 items-center justify-between gap-2 border-b border-neon-cyan/30 bg-dark-card/95 px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-sm"
      style="padding-top: max(0.5rem, env(safe-area-inset-top)); padding-left: max(0.75rem, env(safe-area-inset-left)); padding-right: max(0.75rem, env(safe-area-inset-right));"
    >
      <div class="flex items-center gap-2 min-w-0">
        <NuxtLink
          :to="backTo"
          class="btn-pixel px-2.5 py-1.5 text-[10px] sm:text-xs shrink-0 flex items-center gap-1"
          title="Retour à l'accueil"
          aria-label="Retour à l'accueil"
        >
          <span>⬅</span>
          <span class="hidden sm:inline">Accueil</span>
        </NuxtLink>

        <h1 class="font-pixel text-[10px] sm:text-xs text-neon-cyan truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
          {{ title }}
        </h1>
      </div>

      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <slot name="actions" />
        <FullscreenButton compact />
      </div>
    </header>

    <!-- Zone principale du jeu (100% de l'espace restant, sans scroll parasite) -->
    <div
      class="game-stage relative flex-1 min-h-0 w-full overflow-hidden bg-black"
      style="padding-bottom: env(safe-area-inset-bottom); padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right);"
    >
      <slot />
    </div>
  </main>
</template>

<style scoped>
.game-shell {
  touch-action: none;
}

@media (max-height: 500px) and (orientation: landscape) {
  .game-shell-header {
    padding-top: max(0.25rem, env(safe-area-inset-top));
    padding-bottom: 0.25rem;
    background: rgba(10, 15, 31, 0.85);
  }
}
</style>
