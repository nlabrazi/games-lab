<!--
  En-tête avec logo animé et navigation vers les sections.
  Le titre utilise l'effet glitch défini dans glitch.css.
-->
<template>
  <header class="text-center pt-12 pb-16">
    <div class="flex items-center justify-center gap-4 mb-6">
      <span class="text-5xl animate-blink">🕹️</span>
      <h1 class="glitch font-pixel text-3xl sm:text-4xl text-neon-magenta" data-text="GAMES LAB">
        GAMES LAB
      </h1>
    </div>
    <p class="text-xl sm:text-2xl text-gray-300 mb-10 tracking-wide">
      Des jeux faits maison, jouables dans ton navigateur
    </p>
    <nav>
      <ul class="flex justify-center gap-4 sm:gap-8 flex-wrap">
        <li><a href="#games" class="btn-pixel text-sm">🎮 Jeux</a></li>
        <li><a href="#about" class="btn-pixel text-sm">📖 À propos</a></li>
        <li><a href="#contact" class="btn-pixel text-sm">📬 Contact</a></li>
      </ul>
    </nav>
  </header>
</template>
