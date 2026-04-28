<!--
  Page d'accueil one-page : En-tête, galerie, détail (conditionnel), à propos, contact.
  Gère l'affichage du composant GameDetail via le composable useGames.
-->
<template>
  <main class="max-w-6xl mx-auto px-4 py-8">
    <TheHeader />

    <!-- Galerie de jeux -->
    <section id="games" class="mb-20 scroll-mt-24">
      <h2
        class="section-title text-2xl font-pixel text-neon-cyan text-center mb-12 border-b-2 border-dashed border-neon-cyan pb-4">
        // MES JEUX</h2>

      <!-- Si un jeu est sélectionné, afficher le détail -->
      <GameDetail v-if="selectedGame" @back="clearSelection" />
      <!-- Sinon afficher la grille -->
      <GameGrid v-else @select="selectGame" />
    </section>

    <!-- Section À propos -->
    <section id="about" class="mb-20 scroll-mt-24">
      <h2
        class="section-title text-2xl font-pixel text-neon-cyan text-center mb-8 border-b-2 border-dashed border-neon-cyan pb-4">
        // QUI SUIS-JE ?</h2>
      <div
        class="flex flex-col md:flex-row items-center gap-8 bg-dark-card p-8 rounded-lg border border-neon-magenta/50 shadow-lg shadow-neon-magenta/20 max-w-2xl mx-auto">
        <div
          class="text-6xl bg-dark-accent w-32 h-32 flex items-center justify-center rounded-full border-2 border-neon-red">
          🧑‍💻</div>
        <p class="flex-1 text-lg leading-relaxed">
          Développeur passionné par le jeu vidéo et le web. Je crée des expériences interactives rétro avec des
          technologies modernes (React, Vanilla JS, Canvas). Chaque jeu est un petit défi technique et artistique.
          Explore, joue et donne-moi ton avis !
        </p>
      </div>
    </section>

    <!-- Section Contact -->
    <section id="contact" class="scroll-mt-24">
      <h2
        class="section-title text-2xl font-pixel text-neon-cyan text-center mb-8 border-b-2 border-dashed border-neon-cyan pb-4">
        // CONTACT</h2>
      <div class="flex justify-center gap-6 flex-wrap mb-12">
        <a href="mailto:na.labrazi@gmail.com" class="btn-pixel">📧 Email</a>
        <a href="https://github.com/nlabrazi" target="_blank" rel="noopener" class="btn-pixel">🐙 GitHub</a>
        <a href="https://linkedin.com/in/nabil" target="_blank" rel="noopener" class="btn-pixel">💼 LinkedIn</a>
      </div>
      <TheFooter />
    </section>
  </main>
</template>

<script setup lang="ts">
/*
  Initialise les jeux depuis le composable.
*/
import { useGames } from "~/composables/useGames";

const { selectedGame, selectGame, clearSelection } = useGames();
</script>
