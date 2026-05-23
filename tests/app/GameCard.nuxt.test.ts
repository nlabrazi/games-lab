import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import GameCard from "../../app/components/GameCard.vue";
import { games } from "../../app/data/games";

describe("GameCard", () => {
  it("renders the game summary", async () => {
    const game = games[0];
    const wrapper = await mountSuspended(GameCard, {
      props: {
        game,
      },
    });

    expect(wrapper.text()).toContain(game.title);
    expect(wrapper.text()).toContain(game.shortDesc);
  });

  it("emits the selected game when clicked", async () => {
    const game = games[0];
    const wrapper = await mountSuspended(GameCard, {
      props: {
        game,
      },
    });

    await wrapper.trigger("click");

    expect(wrapper.emitted("select")).toEqual([[game]]);
  });
});
