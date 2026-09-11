<script setup lang="ts">
import { useFullscreen } from "~/composables/useFullscreen";

const props = withDefaults(
  defineProps<{
    compact?: boolean;
  }>(),
  {
    compact: false,
  },
);

const { isFullscreen, isSupported, toggleFullscreen } = useFullscreen();
</script>

<template>
  <button
    v-if="isSupported"
    type="button"
    class="btn-pixel inline-flex items-center justify-center gap-1.5 transition-all select-none"
    :class="[
      compact
        ? 'px-2.5 py-1.5 text-[10px] leading-none'
        : 'px-3 py-2 text-xs'
    ]"
    :title="isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'"
    :aria-label="isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'"
    @click="toggleFullscreen"
  >
    <span class="text-xs sm:text-sm leading-none" aria-hidden="true">
      {{ isFullscreen ? '🗗' : '⛶' }}
    </span>
    <span v-if="!compact" class="hidden sm:inline">
      {{ isFullscreen ? 'Fenêtré' : 'Plein écran' }}
    </span>
  </button>
</template>
