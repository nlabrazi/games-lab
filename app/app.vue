<!--
  Layout racine de l'application.
  Intègre le fond étoilé, le CRT overlay, et le contenu principal.
-->
<template>
  <div class="relative min-h-screen bg-dark font-retro text-white">
    <!-- Fond animé -->
    <Starfield class="fixed inset-0 z-0" />
    <!-- Overlay CRT (scanlines + vignette) -->
    <div class="crt-overlay fixed inset-0 z-10 pointer-events-none" />
    <!-- Contenu principal -->
    <div class="relative z-20">
      <NuxtPage />
    </div>
  </div>
</template>
