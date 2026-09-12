import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import DosTouchControls from "../../app/components/DosTouchControls.vue";

describe("DosTouchControls", () => {
  it("renders the 3x2 dungeon crawler D-pad and action buttons", async () => {
    const wrapper = await mountSuspended(DosTouchControls, {
      props: {
        modelValue: true,
        rightClickActive: false,
      },
    });

    // 6 boutons D-Pad : Avancer, Reculer, Pivoter G/D, Strafe G/D
    expect(wrapper.find('[data-control="forward"]').exists()).toBe(true);
    expect(wrapper.find('[data-control="backward"]').exists()).toBe(true);
    expect(wrapper.find('[data-control="turn-left"]').exists()).toBe(true);
    expect(wrapper.find('[data-control="turn-right"]').exists()).toBe(true);
    expect(wrapper.find('[data-control="strafe-left"]').exists()).toBe(true);
    expect(wrapper.find('[data-control="strafe-right"]').exists()).toBe(true);

    // Boutons d'actions
    expect(wrapper.text()).toContain("ATTAQUE");
    expect(wrapper.text()).toContain("VALIDER");
    expect(wrapper.text()).toContain("CARTE");
    expect(wrapper.text()).toContain("REPOS");
    expect(wrapper.text()).toContain("ÉCHAP");
  });

  it("dispatches window keydown and emits sendKey on D-pad pointerdown", async () => {
    const windowListener = vi.fn();
    window.addEventListener("keydown", windowListener);

    const wrapper = await mountSuspended(DosTouchControls, {
      props: {
        modelValue: true,
      },
    });

    const forwardBtn = wrapper.find('[data-control="forward"]');
    await forwardBtn.trigger("pointerdown", { pointerId: 1 });

    // Vérifier l'événement DOM émis sur window (keyCode 38 pour ArrowUp)
    expect(windowListener).toHaveBeenCalled();
    const event = windowListener.mock.calls[0][0] as KeyboardEvent;
    expect(event.keyCode).toBe(38);
    expect(event.key).toBe("ArrowUp");

    // Vérifier l'événement Vue émis pour le parent
    expect(wrapper.emitted("sendKey")).toBeTruthy();
    expect(wrapper.emitted("sendKey")?.[0]).toEqual([38, true]);

    window.removeEventListener("keydown", windowListener);
  });

  it("emits correct keycode for strafe left (Numpad 4 / keyCode 100)", async () => {
    const wrapper = await mountSuspended(DosTouchControls, {
      props: {
        modelValue: true,
      },
    });

    const strafeBtn = wrapper.find('[data-control="strafe-left"]');
    await strafeBtn.trigger("pointerdown", { pointerId: 1 });

    expect(wrapper.emitted("sendKey")).toBeTruthy();
    expect(wrapper.emitted("sendKey")?.[0]).toEqual([100, true]);
  });

  it("toggles the right-click modifier state on click", async () => {
    const wrapper = await mountSuspended(DosTouchControls, {
      props: {
        modelValue: true,
        rightClickActive: false,
      },
    });

    const rClickBtn = wrapper.findAll("button").find((b) => b.text().includes("CLIC DROIT"));
    expect(rClickBtn?.exists()).toBe(true);

    await rClickBtn?.trigger("pointerdown");
    expect(wrapper.emitted("update:rightClickActive")).toBeTruthy();
    expect(wrapper.emitted("update:rightClickActive")?.[0]).toEqual([true]);
  });

  it("toggles visibility when fold/unfold button is clicked", async () => {
    const wrapper = await mountSuspended(DosTouchControls, {
      props: {
        modelValue: true,
      },
    });

    const foldBtn = wrapper.findAll("button").find((b) => b.text().includes("Masquer"));
    expect(foldBtn?.exists()).toBe(true);

    await foldBtn?.trigger("pointerdown");
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([false]);
  });
});
