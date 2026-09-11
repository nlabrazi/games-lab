import { expect, test } from "@playwright/test";

test.describe("Arcade 2D Games Mobile Touch & Layout", () => {
  test("Pixel Invaders renders mobile controls on touch and hides them on desktop", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/games/pixel-invaders");

    const iframe = page.frameLocator("iframe");

    // Canevas principal
    const canvas = iframe.locator("#gameCanvas");
    await expect(canvas).toBeVisible();

    const mobileControls = iframe.locator(".mobile-controls");

    if (isMobile) {
      await expect(mobileControls).toBeVisible();

      const leftBtn = iframe.locator('[data-hold-control="left"]');
      const rightBtn = iframe.locator('[data-hold-control="right"]');
      const fireBtn = iframe.locator('[data-hold-control="fire"]');

      await expect(leftBtn).toBeVisible();
      await expect(rightBtn).toBeVisible();
      await expect(fireBtn).toBeVisible();

      // Interaction tactile sur le bouton tir
      await fireBtn.click();
    } else {
      await expect(mobileControls).toBeHidden();
    }

    // Vérifie l'absence de scroll parasite
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight + 2;
    });
    expect(isOverflowing).toBe(false);
  });

  test("Puzzle Blocks displays board and manages touch controls visibility", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/games/puzzle-blocks");

    const iframe = page.frameLocator("iframe");

    const board = iframe.locator("#boardCanvas");
    await expect(board).toBeVisible();

    const nextCanvas = iframe.locator("#nextCanvas");
    await expect(nextCanvas).toBeVisible();

    const mobileControls = iframe.locator(".mobile-controls");

    if (isMobile) {
      await expect(mobileControls).toBeVisible();

      const rotateBtn = iframe.locator('[data-mobile-tap="rotate"]');
      const dropBtn = iframe.locator('[data-mobile-tap="drop"]');

      await expect(rotateBtn).toBeVisible();
      await expect(dropBtn).toBeVisible();

      // Action rotation tactile
      await rotateBtn.click();
    } else {
      await expect(mobileControls).toBeHidden();
    }
  });
});
