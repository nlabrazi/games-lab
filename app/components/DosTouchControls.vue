<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    rightClickActive?: boolean;
  }>(),
  {
    modelValue: true,
    rightClickActive: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "update:rightClickActive", value: boolean): void;
  (e: "sendKey", keyCode: number, pressed: boolean): void;
}>();

const isVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit("update:modelValue", val),
});

const isRightClick = computed({
  get: () => props.rightClickActive,
  set: (val: boolean) => emit("update:rightClickActive", val),
});

// Suivi des boutons actifs pour l'affichage visuel et la garantie du temps d'appui
const activeKeys = ref<Set<string>>(new Set());
const pressStartTimes = new Map<string, number>();
const releaseTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const MIN_HOLD_DURATION_MS = 80;

interface ControlConfig {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  keyCode: number;
  key: string;
  code: string;
  color?: "cyan" | "magenta" | "yellow" | "green";
}

const dpadControls: ControlConfig[] = [
  // Ligne 1 : Pivoter Gauche, Avancer, Pivoter Droite
  { id: "turn-left", label: "↰", sublabel: "G", keyCode: 37, key: "ArrowLeft", code: "ArrowLeft" },
  { id: "forward", label: "▲", sublabel: "Avancer", keyCode: 38, key: "ArrowUp", code: "ArrowUp" },
  { id: "turn-right", label: "↱", sublabel: "D", keyCode: 39, key: "ArrowRight", code: "ArrowRight" },
  // Ligne 2 : Pas chassé G (Strafe L), Reculer, Pas chassé D (Strafe R)
  { id: "strafe-left", label: "⇇", sublabel: "Pas G", keyCode: 100, key: "4", code: "Numpad4" },
  { id: "backward", label: "▼", sublabel: "Reculer", keyCode: 40, key: "ArrowDown", code: "ArrowDown" },
  { id: "strafe-right", label: "⇉", sublabel: "Pas D", keyCode: 102, key: "6", code: "Numpad6" },
];

const actionControls: ControlConfig[] = [
  { id: "action-attack", label: "ATTAQUE", sublabel: "Espace", keyCode: 32, key: " ", code: "Space", color: "magenta" },
  { id: "action-enter", label: "ENTRÉE", sublabel: "Valider", keyCode: 13, key: "Enter", code: "Enter", color: "cyan" },
  { id: "action-map", label: "CARTE", sublabel: "Tab", keyCode: 9, key: "Tab", code: "Tab", color: "yellow" },
  { id: "action-rest", label: "REPOS", sublabel: "R", keyCode: 82, key: "r", code: "KeyR", color: "green" },
  { id: "action-esc", label: "MENU", sublabel: "Échap", keyCode: 27, key: "Escape", code: "Escape", color: "cyan" },
];

const triggerHaptic = (duration = 10) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(duration);
    } catch {
      // Ignore vibration errors
    }
  }
};

const dispatchDosKeyEvent = (config: ControlConfig, pressed: boolean) => {
  // 1. Émettre pour le parent qui peut appeler commandInterface.sendKeyEvent si disponible
  emit("sendKey", config.keyCode, pressed);

  // 2. Dispatcher KeyboardEvent globalement sur window (capturé nativement par js-dos)
  if (typeof window !== "undefined") {
    const eventType = pressed ? "keydown" : "keyup";
    const event = new KeyboardEvent(eventType, {
      bubbles: true,
      cancelable: true,
      keyCode: config.keyCode,
      which: config.keyCode,
      key: config.key,
      code: config.code,
    });
    window.dispatchEvent(event);
  }
};

const handlePointerDown = (config: ControlConfig, event: PointerEvent) => {
  event.preventDefault();
  event.stopPropagation();

  const target = event.currentTarget as HTMLElement | null;
  target?.setPointerCapture?.(event.pointerId);

  // Annuler un éventuel relâchement différé précédent
  const existingTimeout = releaseTimeouts.get(config.id);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    releaseTimeouts.delete(config.id);
  }

  activeKeys.value.add(config.id);
  pressStartTimes.set(config.id, performance.now());

  triggerHaptic(config.color === "magenta" ? 15 : 8);
  dispatchDosKeyEvent(config, true);
};

const handlePointerUp = (config: ControlConfig, event?: PointerEvent) => {
  event?.preventDefault();
  event?.stopPropagation();

  const startTime = pressStartTimes.get(config.id) ?? performance.now();
  const elapsed = performance.now() - startTime;
  const remaining = Math.max(0, MIN_HOLD_DURATION_MS - elapsed);

  const doRelease = () => {
    activeKeys.value.delete(config.id);
    pressStartTimes.delete(config.id);
    releaseTimeouts.delete(config.id);
    dispatchDosKeyEvent(config, false);
  };

  if (remaining > 0) {
    const timeout = setTimeout(doRelease, remaining);
    releaseTimeouts.set(config.id, timeout);
  } else {
    doRelease();
  }
};

const toggleRightClick = (event: Event) => {
  event.preventDefault();
  event.stopPropagation();
  triggerHaptic(12);
  isRightClick.value = !isRightClick.value;
};

const toggleVisibility = () => {
  triggerHaptic(10);
  isVisible.value = !isVisible.value;
};

onBeforeUnmount(() => {
  for (const timeout of releaseTimeouts.values()) {
    clearTimeout(timeout);
  }
  releaseTimeouts.clear();
});
</script>

<template>
  <div class="dos-touch-overlay pointer-events-none absolute inset-0 z-20 flex flex-col justify-between overflow-hidden select-none">
    <!-- Barre discrète de commande supérieure (bouton masquer/afficher & indicateur clic droit) -->
    <div class="top-bar flex items-center justify-between p-2">
      <!-- Toggle Clic Droit -->
      <button
        type="button"
        class="pointer-events-auto flex items-center gap-1.5 rounded border px-2.5 py-1 text-[10px] font-pixel transition-all"
        :class="[
          isRightClick
            ? 'border-amber-400 bg-amber-500/30 text-amber-300 shadow-lg shadow-amber-500/30 animate-pulse'
            : 'border-neon-cyan/40 bg-black/60 text-gray-300 backdrop-blur-sm active:bg-neon-cyan/20'
        ]"
        :title="isRightClick ? 'Clic droit armé (actif pour le prochain tap)' : 'Activer le clic droit pour le prochain tap'"
        @pointerdown.stop="toggleRightClick"
      >
        <span class="inline-block h-2 w-2 rounded-full" :class="isRightClick ? 'bg-amber-400' : 'bg-gray-500'" />
        <span>{{ isRightClick ? 'CLIC DROIT ACTIF' : 'CLIC DROIT' }}</span>
      </button>

      <!-- Bouton Réduire / Afficher -->
      <button
        type="button"
        class="pointer-events-auto flex items-center gap-1 rounded border border-neon-cyan/40 bg-black/60 px-2.5 py-1 text-[10px] font-pixel text-neon-cyan backdrop-blur-sm active:bg-neon-cyan/20"
        :title="isVisible ? 'Masquer les contrôles tactiles' : 'Afficher les contrôles tactiles'"
        @pointerdown.stop="toggleVisibility"
      >
        <span>{{ isVisible ? '🎮 Masquer' : '🎮 Contrôles' }}</span>
      </button>
    </div>

    <!-- Zone principale des commandes (masquable) -->
    <Transition name="controls-fade">
      <div
        v-if="isVisible"
        class="controls-body pointer-events-none flex flex-1 items-end justify-between p-2.5 sm:p-4"
        style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom)); padding-left: max(0.5rem, env(safe-area-inset-left)); padding-right: max(0.5rem, env(safe-area-inset-right));"
      >
        <!-- PAD DIRECTIONNEL (Gauche) : Format Dungeon Crawler 3x2 -->
        <div class="dpad-cluster pointer-events-auto grid grid-cols-3 gap-1.5 rounded-xl border border-neon-cyan/30 bg-black/75 p-1.5 shadow-xl shadow-black/80 backdrop-blur-md">
          <button
            v-for="btn in dpadControls"
            :key="btn.id"
            type="button"
            class="dpad-btn flex flex-col items-center justify-center rounded-lg border border-neon-cyan/40 bg-dark-card/90 transition-all select-none active:scale-95"
            :class="{ 'is-active': activeKeys.has(btn.id) }"
            :data-control="btn.id"
            :aria-label="btn.sublabel || btn.label"
            @pointerdown="handlePointerDown(btn, $event)"
            @pointerup="handlePointerUp(btn, $event)"
            @pointercancel="handlePointerUp(btn, $event)"
            @lostpointercapture="handlePointerUp(btn)"
          >
            <span class="font-pixel text-sm font-bold text-neon-cyan leading-none sm:text-base">
              {{ btn.label }}
            </span>
            <span v-if="btn.sublabel" class="mt-0.5 text-[8px] font-pixel text-gray-400 leading-none">
              {{ btn.sublabel }}
            </span>
          </button>
        </div>

        <!-- PALETTE D'ACTIONS RAPIDES (Droite) -->
        <div class="action-cluster pointer-events-auto flex flex-col gap-1.5 rounded-xl border border-neon-cyan/30 bg-black/75 p-1.5 shadow-xl shadow-black/80 backdrop-blur-md">
          <div class="flex items-center gap-1.5">
            <!-- Bouton Échap / Menu -->
            <button
              type="button"
              class="action-btn-small rounded-lg border border-neon-cyan/40 bg-dark-card/90 px-2 py-1.5 font-pixel text-[9px] text-gray-300 transition-all select-none active:scale-95"
              :class="{ 'is-active': activeKeys.has('action-esc') }"
              @pointerdown="handlePointerDown(actionControls[4], $event)"
              @pointerup="handlePointerUp(actionControls[4], $event)"
              @pointercancel="handlePointerUp(actionControls[4], $event)"
              @lostpointercapture="handlePointerUp(actionControls[4])"
            >
              ÉCHAP
            </button>

            <!-- Bouton Carte -->
            <button
              type="button"
              class="action-btn-small rounded-lg border border-yellow-400/40 bg-dark-card/90 px-2 py-1.5 font-pixel text-[9px] text-yellow-300 transition-all select-none active:scale-95"
              :class="{ 'is-active': activeKeys.has('action-map') }"
              @pointerdown="handlePointerDown(actionControls[2], $event)"
              @pointerup="handlePointerUp(actionControls[2], $event)"
              @pointercancel="handlePointerUp(actionControls[2], $event)"
              @lostpointercapture="handlePointerUp(actionControls[2])"
            >
              CARTE
            </button>

            <!-- Bouton Repos -->
            <button
              type="button"
              class="action-btn-small rounded-lg border border-emerald-400/40 bg-dark-card/90 px-2 py-1.5 font-pixel text-[9px] text-emerald-300 transition-all select-none active:scale-95"
              :class="{ 'is-active': activeKeys.has('action-rest') }"
              @pointerdown="handlePointerDown(actionControls[3], $event)"
              @pointerup="handlePointerUp(actionControls[3], $event)"
              @pointercancel="handlePointerUp(actionControls[3], $event)"
              @lostpointercapture="handlePointerUp(actionControls[3])"
            >
              REPOS
            </button>
          </div>

          <div class="flex items-center gap-1.5">
            <!-- Bouton Attaque / Action Principal -->
            <button
              type="button"
              class="action-btn-main flex-1 rounded-lg border-2 border-neon-pink/70 bg-neon-pink/20 px-3 py-2 text-center transition-all select-none active:scale-95 shadow-md shadow-neon-pink/20"
              :class="{ 'is-active-pink': activeKeys.has('action-attack') }"
              @pointerdown="handlePointerDown(actionControls[0], $event)"
              @pointerup="handlePointerUp(actionControls[0], $event)"
              @pointercancel="handlePointerUp(actionControls[0], $event)"
              @lostpointercapture="handlePointerUp(actionControls[0])"
            >
              <span class="block font-pixel text-xs font-bold text-neon-pink">ATTAQUE</span>
              <span class="block text-[8px] font-pixel text-neon-pink/70">ESPACE</span>
            </button>

            <!-- Bouton Entrée / Valider -->
            <button
              type="button"
              class="action-btn-main flex-1 rounded-lg border-2 border-neon-cyan/70 bg-neon-cyan/20 px-3 py-2 text-center transition-all select-none active:scale-95 shadow-md shadow-neon-cyan/20"
              :class="{ 'is-active-cyan': activeKeys.has('action-enter') }"
              @pointerdown="handlePointerDown(actionControls[1], $event)"
              @pointerup="handlePointerUp(actionControls[1], $event)"
              @pointercancel="handlePointerUp(actionControls[1], $event)"
              @lostpointercapture="handlePointerUp(actionControls[1])"
            >
              <span class="block font-pixel text-xs font-bold text-neon-cyan">VALIDER</span>
              <span class="block text-[8px] font-pixel text-neon-cyan/70">ENTRÉE</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dos-touch-overlay {
  touch-action: none;
}

.dpad-btn {
  width: 52px;
  height: 48px;
  touch-action: none;
}

@media (min-width: 640px) {
  .dpad-btn {
    width: 60px;
    height: 54px;
  }
}

.dpad-btn.is-active {
  background-color: rgba(56, 247, 232, 0.3) !important;
  border-color: #38f7e8 !important;
  box-shadow: 0 0 12px rgba(56, 247, 232, 0.5);
  transform: scale(0.94);
}

.action-btn-small {
  min-width: 48px;
  height: 32px;
  touch-action: none;
}

.action-btn-small.is-active {
  background-color: rgba(255, 255, 255, 0.25) !important;
  transform: scale(0.94);
}

.action-btn-main {
  min-width: 76px;
  height: 46px;
  touch-action: none;
}

.is-active-pink {
  background-color: rgba(255, 0, 128, 0.45) !important;
  border-color: #ff0080 !important;
  box-shadow: 0 0 16px rgba(255, 0, 128, 0.6);
  transform: scale(0.94);
}

.is-active-cyan {
  background-color: rgba(56, 247, 232, 0.45) !important;
  border-color: #38f7e8 !important;
  box-shadow: 0 0 16px rgba(56, 247, 232, 0.6);
  transform: scale(0.94);
}

.controls-fade-enter-active,
.controls-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.controls-fade-enter-from,
.controls-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
