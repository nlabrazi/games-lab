import type { H3Event } from "h3";
import { describe, expect, it } from "vitest";
import { resolveDosSaveDescriptor } from "../../server/utils/dos-save-requests";

const createSaveRequestEvent = (params: Record<string, string | undefined>) =>
  ({
    context: {
      params,
    },
  }) as H3Event;

const expectStatusError = (callback: () => void, statusCode: number) => {
  let error: unknown;

  try {
    callback();
  } catch (caughtError) {
    error = caughtError;
  }

  expect(error).toMatchObject({ statusCode });
};

describe("dos save request utils", () => {
  it("resolves an available game and requested save slot", () => {
    expect(
      resolveDosSaveDescriptor(
        createSaveRequestEvent({
          gameSlug: "lands-of-lore",
          slotId: "manual",
        }),
      ),
    ).toEqual({
      gameSlug: "lands-of-lore",
      slotId: "manual",
    });
  });

  it("uses the default slot when no slot is provided", () => {
    expect(
      resolveDosSaveDescriptor(
        createSaveRequestEvent({
          gameSlug: "lands-of-lore",
        }),
      ),
    ).toEqual({
      gameSlug: "lands-of-lore",
      slotId: "default",
    });
  });

  it("rejects unknown and placeholder games", () => {
    expectStatusError(
      () =>
        resolveDosSaveDescriptor(
          createSaveRequestEvent({
            gameSlug: "unknown-game",
            slotId: "manual",
          }),
        ),
      404,
    );

    expectStatusError(
      () =>
        resolveDosSaveDescriptor(
          createSaveRequestEvent({
            gameSlug: "doom",
            slotId: "manual",
          }),
        ),
      404,
    );
  });
});
