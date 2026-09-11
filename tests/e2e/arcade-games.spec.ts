import { expect, test } from "@playwright/test";

test.describe("Arcade 2D Games Mobile Touch & Layout", () => {
  test("Pixel Invaders renders mobile controls and canvas without overflow", async ({ page }) => {
    await page.goto("/games/pixel-invaders");

    const iframe = page.frameLocator("iframe");

    // Vérifie le canevas et les contrôles tactiles dans l'iframe
    const canvas = iframe.locator("#gameCanvas");
    await expect(canvas).toBeVisible();

    const mobileControls = iframe.locator(".mobile-controls");
    await expect(mobileControls).toBeVisible();

    const leftBtn = iframe.locator('[data-hold-control="left"]');
    const rightBtn = iframe.locator('[data-hold-control="right"]');
    const fireBtn = iframe.locator('[data-hold-control="fire"]');

    await expect(leftBtn).toBeVisible();
    await expect(rightBtn).toBeVisible();
    await expect(fireBtn).toBeVisible();

    // Interaction tactile sur le bouton tir
    await fireBtn.click();

    // Vérifie l'absence de scroll parasite
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight + 2;
    });
    expect(isOverflowing).toBe(false);
  });

  test("Puzzle Blocks displays board, next piece preview and mobile controls", async ({ page }) => {
    await page.goto("/games/puzzle-blocks");

    const iframe = page.frameLocator("iframe");

    const board = iframe.locator("#boardCanvas");
    await expect(board).toBeVisible();

    // Next piece canvas est maintenant visible sur mobile
    const nextCanvas = iframe.locator("#nextCanvas");
    await expect(nextCanvas).toBeVisible();

    const mobileControls = iframe.locator(".mobile-controls");
    await expect(mobileControls).toBeVisible();

    const rotateBtn = iframe.locator('[data-mobile-tap="rotate"]');
    const dropBtn = iframe.locator('[data-mobile-tap="drop"]');

    await expect(rotateBtn).toBeVisible();
    await expect(dropBtn).toBeVisible();

    // Action rotation tactile
    await rotateBtn.click();
  });
});
