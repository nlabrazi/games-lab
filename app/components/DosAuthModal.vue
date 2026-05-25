<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { DosAuthUsername } from "~/composables/useDosAuth";

const props = defineProps<{
  error: string;
  loading: boolean;
  open: boolean;
  password: string;
  username: DosAuthUsername;
}>();

const emit = defineEmits<{
  close: [];
  submit: [];
  "update:password": [password: string];
  "update:username": [username: DosAuthUsername];
}>();

const passwordInput = ref<HTMLInputElement | null>(null);

const focusPasswordInput = async () => {
  await nextTick();
  passwordInput.value?.focus();
};

const stopKeyboardEvent = (event: KeyboardEvent) => {
  event.stopPropagation();
};

const updateUsername = (event: Event) => {
  emit("update:username", (event.target as HTMLSelectElement).value as DosAuthUsername);
};

const updatePassword = (event: Event) => {
  emit("update:password", (event.target as HTMLInputElement).value);
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void focusPasswordInput();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <div
    v-if="open"
    class="absolute inset-0 z-20 flex items-center justify-center bg-black/75 px-4"
    role="dialog"
    aria-modal="true"
    @keydown.capture="stopKeyboardEvent"
    @keyup.capture="stopKeyboardEvent"
    @keypress.capture="stopKeyboardEvent">
    <form
      class="w-full max-w-sm border border-neon-cyan/60 bg-dark-card p-5 shadow-xl shadow-neon-cyan/20"
      @submit.prevent="$emit('submit')">
      <div class="mb-5 flex items-center justify-between gap-4">
        <h2 class="font-pixel text-[10px] text-neon-cyan">Connexion</h2>
        <button
          type="button"
          class="text-2xl leading-none text-gray-300 hover:text-white"
          aria-label="Fermer"
          @click="$emit('close')">
          x
        </button>
      </div>

      <label class="block text-sm text-gray-300" for="dos-save-login-username">Compte</label>
      <select
        id="dos-save-login-username"
        :value="username"
        class="mt-2 w-full border border-neon-cyan/40 bg-black px-3 py-2 font-pixel text-[10px] text-neon-cyan outline-none focus:border-neon-cyan"
        @change="updateUsername">
        <option value="admin">admin</option>
        <option value="guest">guest</option>
      </select>

      <label class="mt-4 block text-sm text-gray-300" for="dos-save-login-password">
        Mot de passe
      </label>
      <input
        id="dos-save-login-password"
        ref="passwordInput"
        :value="password"
        class="mt-2 w-full border border-neon-cyan/40 bg-black px-3 py-2 text-base text-white outline-none focus:border-neon-cyan"
        required
        autocomplete="current-password"
        type="password"
        @input="updatePassword" />

      <p v-if="error" class="mt-4 text-sm leading-5 text-red-300">
        {{ error }}
      </p>

      <div class="mt-5 flex justify-end gap-3">
        <button type="button" class="btn-pixel text-xs" @click="$emit('close')">Annuler</button>
        <button type="submit" class="btn-pixel text-xs" :disabled="loading">
          {{ loading ? "Connexion..." : "Valider" }}
        </button>
      </div>
    </form>
  </div>
</template>
