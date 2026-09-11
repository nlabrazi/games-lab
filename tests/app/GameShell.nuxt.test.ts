import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import GameShell from "../../app/components/GameShell.vue";

describe("GameShell", () => {
  it("renders the game title and back link", async () => {
    const wrapper = await mountSuspended(GameShell, {
      props: {
        title: "Test Retro Game",
        backTo: "/",
      },
      slots: {
        default: () => h("div", { "data-testid": "game-content" }, "Contenu du jeu"),
      },
    });

    expect(wrapper.text()).toContain("Test Retro Game");
    expect(wrapper.text()).toContain("Accueil");
    expect(wrapper.find('[data-testid="game-content"]').exists()).toBe(true);

    const backLink = wrapper.find("a");
    expect(backLink.attributes("href")).toBe("/");
  });

  it("renders custom action slots", async () => {
    const wrapper = await mountSuspended(GameShell, {
      props: {
        title: "MS-DOS Game",
      },
      slots: {
        actions: () => h("button", { "data-testid": "custom-action" }, "Export"),
      },
    });

    expect(wrapper.find('[data-testid="custom-action"]').exists()).toBe(true);
  });
});
