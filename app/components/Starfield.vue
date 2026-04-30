<!--
  Canvas animé créant un fond d'étoiles défilantes.
  L'animation est gérée via requestAnimationFrame dans onMounted.
-->
<template>
  <canvas ref="canvasRef" class="w-full h-full" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationFrameId = 0;

interface Star {
  x: number;
  y: number;
  radius: number;
  speed: number;
  brightness: number;
}

const STAR_COUNT = 150;
let stars: Star[] = [];

const resize = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initStars();
};

const initStars = () => {
  stars = [];
  const canvas = canvasRef.value;
  if (!canvas) return;
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.8 + 0.2,
      speed: Math.random() * 0.5 + 0.1,
      brightness: Math.random() * 0.7 + 0.3,
    });
  }
};

const draw = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const star of stars) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
    ctx.fill();
    star.y += star.speed;
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }
  }
  animationFrameId = requestAnimationFrame(draw);
};

onMounted(() => {
  resize();
  window.addEventListener("resize", resize);
  draw();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resize);
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
});
</script>
