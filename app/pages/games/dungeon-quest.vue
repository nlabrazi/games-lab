<script setup lang="ts">
import combatJs from "~/assets/games/dungeon-quest/combat.js?raw";
import dungeonJs from "~/assets/games/dungeon-quest/dungeon.js?raw";
import entitiesJs from "~/assets/games/dungeon-quest/entities.js?raw";
import gameJs from "~/assets/games/dungeon-quest/game.js?raw";
import gameHtml from "~/assets/games/dungeon-quest/index.html?raw";
import lootJs from "~/assets/games/dungeon-quest/loot.js?raw";
import styleCss from "~/assets/games/dungeon-quest/style.css?raw";
import uiJs from "~/assets/games/dungeon-quest/ui.js?raw";

const scripts = [entitiesJs, dungeonJs, combatJs, lootJs, uiJs, gameJs];
const scriptClose = "</scr" + "ipt>";

const gameSrcdoc = gameHtml
  .replace('<link rel="stylesheet" href="style.css">', `<style>${styleCss}</style>`)
  .replace(
    [
      `  <script src="entities.js">${scriptClose}`,
      `  <script src="dungeon.js">${scriptClose}`,
      `  <script src="combat.js">${scriptClose}`,
      `  <script src="loot.js">${scriptClose}`,
      `  <script src="ui.js">${scriptClose}`,
      `  <script src="game.js">${scriptClose}`,
    ].join("\n"),
    scripts.map((script) => `  <script>${script}${scriptClose}`).join("\n"),
  );
</script>

<template>
  <GameShell title="Dungeon Quest">
    <iframe
      :srcdoc="gameSrcdoc"
      class="h-full w-full border-0 block"
      title="Dungeon Quest"
      allow="fullscreen"
    />
  </GameShell>
</template>
