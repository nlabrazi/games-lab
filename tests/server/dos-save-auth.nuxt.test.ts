import type { H3Event } from "h3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requireDosSaveApiAccess } from "../../server/utils/dos-save-auth";

const createAuthEvent = (authorization?: string) =>
  ({
    context: {},
    node: {
      req: {
        headers: authorization ? { authorization } : {},
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

describe("dos save auth", () => {
  let previousToken: string | undefined;

  beforeEach(() => {
    previousToken = process.env.DOS_SAVES_API_TOKEN;
  });

  afterEach(() => {
    if (previousToken === undefined) {
      Reflect.deleteProperty(process.env, "DOS_SAVES_API_TOKEN");
    } else {
      process.env.DOS_SAVES_API_TOKEN = previousToken;
    }
  });

  it("allows a request with the configured bearer token", () => {
    process.env.DOS_SAVES_API_TOKEN = "local-test-token";

    expect(() => requireDosSaveApiAccess(createAuthEvent("Bearer local-test-token"))).not.toThrow();
  });

  it("rejects requests when the save API token is not configured", () => {
    process.env.DOS_SAVES_API_TOKEN = "";

    expectStatusError(() => requireDosSaveApiAccess(createAuthEvent("Bearer any-token")), 503);
  });

  it("rejects the placeholder token from the example environment", () => {
    process.env.DOS_SAVES_API_TOKEN = "change-me-with-a-long-random-secret";

    expectStatusError(
      () => requireDosSaveApiAccess(createAuthEvent("Bearer change-me-with-a-long-random-secret")),
      503,
    );
  });

  it("rejects missing or invalid bearer tokens", () => {
    process.env.DOS_SAVES_API_TOKEN = "local-test-token";

    expectStatusError(() => requireDosSaveApiAccess(createAuthEvent()), 401);
    expectStatusError(
      () => requireDosSaveApiAccess(createAuthEvent("Basic local-test-token")),
      401,
    );
    expectStatusError(() => requireDosSaveApiAccess(createAuthEvent("Bearer wrong-token")), 401);
  });
});
