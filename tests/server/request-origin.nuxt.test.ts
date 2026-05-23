import type { H3Event } from "h3";
import { describe, expect, it } from "vitest";
import { requireSameOriginRequest } from "../../server/utils/request-origin";

const createOriginEvent = (headers: Record<string, string>) =>
  ({
    context: {},
    node: {
      req: {
        headers: {
          host: "games.test",
          ...headers,
        },
        originalUrl: "/api/auth/login",
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

describe("request origin utils", () => {
  it("allows requests without an origin header", () => {
    expect(() => requireSameOriginRequest(createOriginEvent({}))).not.toThrow();
  });

  it("allows same-origin requests", () => {
    expect(() =>
      requireSameOriginRequest(
        createOriginEvent({
          origin: "https://games.test",
          "sec-fetch-site": "same-origin",
          "x-forwarded-proto": "https",
        }),
      ),
    ).not.toThrow();
  });

  it("rejects cross-origin requests", () => {
    expectStatusError(
      () =>
        requireSameOriginRequest(
          createOriginEvent({
            origin: "https://evil.test",
            "x-forwarded-proto": "https",
          }),
        ),
      403,
    );
  });

  it("rejects cross-site fetch metadata", () => {
    expectStatusError(
      () =>
        requireSameOriginRequest(
          createOriginEvent({
            "sec-fetch-site": "cross-site",
          }),
        ),
      403,
    );
  });
});
