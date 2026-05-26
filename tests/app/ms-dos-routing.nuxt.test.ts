import { mockComponent, mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import App from "../../app/app.vue";

mockComponent("Starfield", {
  template: '<div data-testid="starfield" />',
});

mockComponent("JsDosPlayer", {
  props: {
    title: {
      type: String,
      required: true,
    },
  },
  template: '<section data-testid="js-dos-player">Mock DOS Player {{ title }}</section>',
});

describe("MS-DOS routes", () => {
  it("renders the MS-DOS catalog on the index route", async () => {
    const wrapper = await mountSuspended(App, {
      route: "/games/ms-dos",
    });

    expect(wrapper.text()).toContain("Catalogue MS-DOS");
    expect(wrapper.text()).toContain("Lands of Lore: The Throne of Chaos");
    expect(wrapper.text()).toContain("Lancer");
    expect(wrapper.text()).not.toContain("Se connecter pour sauvegarder");
  });

  it("renders the game player route for an available MS-DOS game", async () => {
    const wrapper = await mountSuspended(App, {
      route: "/games/ms-dos/lands-of-lore",
    });

    expect(wrapper.text()).toContain("Accueil");
    expect(wrapper.text()).toContain("Lands of Lore: The Throne of Chaos");
    expect(wrapper.text()).toContain("Mock DOS Player Lands of Lore: The Throne of Chaos");
    expect(wrapper.text()).not.toContain("Catalogue MS-DOS");
    expect(wrapper.text()).not.toContain("Sauvegarde en ligne");
  });
});
