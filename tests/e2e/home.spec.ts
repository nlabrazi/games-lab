import { expect, test } from "@playwright/test";

test.describe("Home Page", () => {
  test("loads the retro portfolio title and game cards", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("GAMES LAB");

    const gameCards = page.locator("button.group");
    await expect(gameCards).toHaveCount(5);

    // Vérifie la présence des jeux principaux
    await expect(page.getByText("Pixel Invaders")).toBeVisible();
    await expect(page.getByText("Puzzle Blocks")).toBeVisible();
    await expect(page.getByText("Dungeon Quest")).toBeVisible();
    await expect(page.getByText("Street Fighter")).toBeVisible();
  });

  test("navigates to a game when clicking its card", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const pixelInvadersCard = page.getByRole("button", { name: /Pixel Invaders/i });
    await expect(pixelInvadersCard).toBeVisible();
    await pixelInvadersCard.click();

    await expect(page).toHaveURL(/\/games\/pixel-invaders/);
    await expect(page.locator("h1")).toContainText("Pixel Invaders");
  });
});
