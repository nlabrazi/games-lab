import { expect, test } from "@playwright/test";

test.describe("RPG & Combat Games Mobile Touch & Layout", () => {
  test("Dungeon Quest renders HUD, message log at top, and controls on mobile", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/games/dungeon-quest");

    const iframe = page.frameLocator("iframe");

    const canvas = iframe.locator("#gameCanvas");
    await expect(canvas).toBeVisible();

    const stats = iframe.locator(".ui-panel .stats");
    await expect(stats).toBeVisible();

    // Message log est affiché en haut sous les stats
    const messageLog = iframe.locator("#messageLog");
    await expect(messageLog).toBeVisible();

    const mobileControls = iframe.locator(".mobile-controls");

    if (isMobile) {
      await expect(mobileControls).toBeVisible();

      const moveUp = iframe.locator('[data-mobile-move="up"]');
      const moveDown = iframe.locator('[data-mobile-move="down"]');
      await expect(moveUp).toBeVisible();
      await expect(moveDown).toBeVisible();

      await moveDown.click();
    } else {
      await expect(mobileControls).toBeHidden();
    }

    // Vérifie l'absence de débordement de scrollbar
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight + 2;
    });
    expect(isOverflowing).toBe(false);
  });

  test("Street Fighter renders responsive arcade layout on mobile and keyboard on desktop", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/games/street-fighter");

    const iframe = page.frameLocator("iframe");

    const canvas = iframe.locator("canvas");
    await expect(canvas).toBeVisible();

    const fightControls = iframe.locator(".mobile-fight-controls");

    if (isMobile) {
      await expect(fightControls).toBeVisible();

      const dpad = iframe.locator(".mobile-dpad");
      await expect(dpad).toBeVisible();

      const attacks = iframe.locator(".mobile-attacks");
      await expect(attacks).toBeVisible();

      const attackButtons = iframe.locator(".mobile-fight-button.attack");
      await expect(attackButtons).toHaveCount(6);

      const lightPunch = iframe.locator('[data-mobile-control="lightPunch"]');
      await expect(lightPunch).toBeVisible();
      await lightPunch.click();
    } else {
      await expect(fightControls).toBeHidden();
    }
  });
});
