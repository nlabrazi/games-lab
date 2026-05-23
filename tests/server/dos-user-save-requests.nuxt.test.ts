import type { H3Event } from "h3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDosAuthSessionCookieValue } from "../../server/utils/dos-auth";
import { resolveUserDosSaveDescriptor } from "../../server/utils/dos-user-save-requests";

const createSaveEvent = ({
  cookie,
  gameSlug = "lands-of-lore",
}: {
  cookie?: string;
  gameSlug?: string;
} = {}) =>
  ({
    context: {
      params: {
        gameSlug,
      },
    },
    node: {
      req: {
        headers: cookie ? { cookie } : {},
      },
    },
  }) as unknown as H3Event;

const expectStatusError = (callback: () => void, statusCode: number) => {
  let error: unknown;

  try {
    callback();
  } catch (caughtError) {
    error = caughtError;
  }

  expect(error).toMatchObject({ statusCode });
};

describe("dos user save request utils", () => {
  let previousSessionSecret: string | undefined;

  beforeEach(() => {
    previousSessionSecret = process.env.DOS_AUTH_SESSION_SECRET;
    process.env.DOS_AUTH_SESSION_SECRET = "local-session-secret";
  });

  afterEach(() => {
    if (previousSessionSecret === undefined) {
      Reflect.deleteProperty(process.env, "DOS_AUTH_SESSION_SECRET");
    } else {
      process.env.DOS_AUTH_SESSION_SECRET = previousSessionSecret;
    }
  });

  it("resolves a save descriptor scoped to the authenticated user", () => {
    const cookieValue = createDosAuthSessionCookieValue(
      "admin",
      Date.now() + 60_000,
      "local-session-secret",
    );

    expect(
      resolveUserDosSaveDescriptor(
        createSaveEvent({
          cookie: `games_lab_dos_auth=${cookieValue}`,
        }),
      ),
    ).toEqual({
      gameSlug: "lands-of-lore",
      slotId: "user-admin",
    });
  });

  it("rejects anonymous save requests", () => {
    expectStatusError(() => resolveUserDosSaveDescriptor(createSaveEvent()), 401);
  });

  it("rejects unknown and placeholder games", () => {
    const cookieValue = createDosAuthSessionCookieValue(
      "guest",
      Date.now() + 60_000,
      "local-session-secret",
    );

    expectStatusError(
      () =>
        resolveUserDosSaveDescriptor(
          createSaveEvent({
            cookie: `games_lab_dos_auth=${cookieValue}`,
            gameSlug: "unknown-game",
          }),
        ),
      404,
    );
    expectStatusError(
      () =>
        resolveUserDosSaveDescriptor(
          createSaveEvent({
            cookie: `games_lab_dos_auth=${cookieValue}`,
            gameSlug: "doom",
          }),
        ),
      404,
    );
  });
});
