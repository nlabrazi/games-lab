import { expect, test } from "@playwright/test";

test.describe("GameShell Mobile & Responsive", () => {
  test("renders immersive shell without document overflow", async ({ page }) => {
    await page.goto("/games/pixel-invaders");

    // En-tête et titre
    await expect(page.locator(".game-shell-header")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Pixel Invaders");

    // Boutons de navigation
    const backBtn = page.getByTitle("Retour à l'accueil");
    await expect(backBtn).toBeVisible();

    // Bouton Plein Écran
    const fsBtn = page.getByRole("button", { name: /plein écran/i });
    await expect(fsBtn).toBeVisible();

    // Vérifie que le conteneur principal est exactement à 100dvh et sans scroll de document
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight + 2;
    });
    expect(isOverflowing).toBe(false);

    // Vérifie que l'iframe est bien rendue et visible
    const iframe = page.locator("iframe");
    await expect(iframe).toBeVisible();

    // Clic sur retour
    await backBtn.click();
    await expect(page).toHaveURL("/");
  });

  test("loads puzzle blocks and dungeon quest within GameShell", async ({ page }) => {
    await page.goto("/games/puzzle-blocks");
    await expect(page.locator("h1")).toContainText("Puzzle Blocks");
    await expect(page.locator("iframe")).toBeVisible();

    await page.goto("/games/dungeon-quest");
    await expect(page.locator("h1")).toContainText("Dungeon Quest");
    await expect(page.locator("iframe")).toBeVisible();
  });
});
