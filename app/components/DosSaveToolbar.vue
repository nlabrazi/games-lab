<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  isRestoring: boolean;
  isSaving: boolean;
  lastSavedAtLabel: string;
  title: string;
  username: string;
}>();

const emit = defineEmits<{
  login: [];
  logout: [];
  save: [];
}>();

const isAccountMenuOpen = ref(false);

const statusLabel = computed(() => {
  if (!props.isAuthenticated) {
    return "Sauvegarde en ligne: Non connecte";
  }

  return `Connecte ${props.username}`;
});

const primaryActionLabel = computed(() => {
  if (!props.isAuthenticated) {
    return "Se connecter";
  }

  if (props.isSaving) {
    return "Sauvegarde...";
  }

  return "Sauvegarder";
});

const toggleAccountMenu = () => {
  isAccountMenuOpen.value = !isAccountMenuOpen.value;
};

const closeAccountMenu = () => {
  isAccountMenuOpen.value = false;
};

const handlePrimaryAction = () => {
  if (props.isAuthenticated) {
    emit("save");
    return;
  }

  emit("login");
};

const handleLogout = () => {
  closeAccountMenu();
  emit("logout");
};
</script>

<template>
  <header
    class="border-b border-neon-cyan/30 bg-dark-card px-4 py-3"
    @keydown.esc="closeAccountMenu">
    <div class="flex flex-wrap items-center gap-3">
      <NuxtLink to="/" class="btn-pixel text-xs">Accueil</NuxtLink>

      <h1 class="min-w-0 flex-1 font-pixel text-[10px] leading-5 text-neon-cyan sm:text-sm">
        <span class="block truncate">{{ title }}</span>
        <span
          v-if="lastSavedAtLabel && isAuthenticated"
          class="mt-1 block text-[8px] leading-4 text-gray-400 sm:text-[9px]">
          Derniere sauvegarde {{ lastSavedAtLabel }}
        </span>
      </h1>

      <p
        class="min-h-[2.5rem] border border-neon-cyan/20 bg-black/40 px-3 py-2 font-pixel text-[8px] leading-4 text-neon-cyan sm:text-[9px] sm:leading-5">
        {{ isRestoring ? "Recuperation sauvegarde..." : statusLabel }}
      </p>

      <button
        type="button"
        class="btn-pixel text-xs"
        :disabled="isSaving || isRestoring"
        @click="handlePrimaryAction">
        {{ primaryActionLabel }}
      </button>

      <div v-if="isAuthenticated" class="relative">
        <button
          type="button"
          class="btn-pixel text-xs"
          :aria-expanded="isAccountMenuOpen"
          aria-haspopup="menu"
          @click="toggleAccountMenu">
          Compte
        </button>

        <div
          v-if="isAccountMenuOpen"
          class="absolute right-0 top-full z-20 mt-2 min-w-[12rem] border border-neon-cyan/35 bg-black/95 p-3 shadow-lg shadow-neon-cyan/10"
          role="menu">
          <p class="font-pixel text-[8px] leading-4 text-neon-cyan sm:text-[9px] sm:leading-5">
            Connecte {{ username }}
          </p>
          <button
            type="button"
            class="mt-3 w-full border border-neon-cyan/25 px-3 py-2 text-left text-xs text-gray-200 transition hover:border-neon-cyan/45 hover:text-white disabled:opacity-60"
            :disabled="isLoggingOut"
            role="menuitem"
            @click="handleLogout">
            {{ isLoggingOut ? "Deconnexion..." : "Deconnexion" }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
