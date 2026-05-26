import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import DosSaveToolbar from "../../app/components/DosSaveToolbar.vue";

describe("DosSaveToolbar", () => {
  it("shows the logged-out online save state and emits login", async () => {
    const wrapper = await mountSuspended(DosSaveToolbar, {
      props: {
        isAuthenticated: false,
        isLoggingOut: false,
        isRestoring: false,
        isSaving: false,
        lastSavedAtLabel: "",
        title: "Lands of Lore: The Throne of Chaos",
        username: "",
      },
    });

    expect(wrapper.text()).toContain("Accueil");
    expect(wrapper.text()).toContain("Lands of Lore: The Throne of Chaos");
    expect(wrapper.text()).toContain("Sauvegarde en ligne: Non connecte");
    expect(wrapper.text()).toContain("Se connecter");

    await wrapper.get("button").trigger("click");

    expect(wrapper.emitted("login")).toHaveLength(1);
    expect(wrapper.emitted("save")).toBeUndefined();
  });

  it("shows the authenticated state, save label and logout action", async () => {
    const wrapper = await mountSuspended(DosSaveToolbar, {
      props: {
        isAuthenticated: true,
        isLoggingOut: false,
        isRestoring: false,
        isSaving: false,
        lastSavedAtLabel: "14:32",
        title: "Lands of Lore: The Throne of Chaos",
        username: "admin",
      },
    });

    expect(wrapper.text()).toContain("Connecte admin");
    expect(wrapper.text()).toContain("Derniere sauvegarde 14:32");
    expect(wrapper.text()).toContain("Sauvegarder");
    expect(wrapper.text()).toContain("Compte");

    await wrapper.findAll("button")[0].trigger("click");
    expect(wrapper.emitted("save")).toHaveLength(1);

    await wrapper.get('button[aria-haspopup="menu"]').trigger("click");
    expect(wrapper.text()).toContain("Deconnexion");

    await wrapper.get('button[role="menuitem"]').trigger("click");
    expect(wrapper.emitted("logout")).toHaveLength(1);
  });

  it("shows the pending save label while saving", async () => {
    const wrapper = await mountSuspended(DosSaveToolbar, {
      props: {
        isAuthenticated: true,
        isLoggingOut: false,
        isRestoring: false,
        isSaving: true,
        lastSavedAtLabel: "",
        title: "Lands of Lore: The Throne of Chaos",
        username: "admin",
      },
    });

    expect(wrapper.text()).toContain("Sauvegarde...");
    expect(wrapper.get("button").attributes("disabled")).toBeDefined();
  });
});
