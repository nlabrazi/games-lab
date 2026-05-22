import type { H3Event } from "h3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDosSaveSessionCookieValue,
  dosSaveSessionCookieName,
  getOrCreateDosSaveBrowserSession,
  parseDosSaveSessionCookieValue,
  requireSameOriginDosSaveRequest,
  resolveBrowserDosSaveDescriptor,
} from "../../server/utils/dos-save-browser-session";

const createResponseMock = () => {
  const headers = new Map<string, number | string | string[]>();

  return {
    headers,
    res: {
      appendHeader: (name: string, value: string) => {
        const key = name.toLowerCase();
        const currentValue = headers.get(key);

        if (Array.isArray(currentValue)) {
          headers.set(key, [...currentValue, value]);
          return;
        }

        if (typeof currentValue === "string") {
          headers.set(key, [currentValue, value]);
          return;
        }

        headers.set(key, value);
      },
      getHeader: (name: string) => headers.get(name.toLowerCase()),
      removeHeader: (name: string) => headers.delete(name.toLowerCase()),
      setHeader: (name: string, value: number | string | string[]) => {
        headers.set(name.toLowerCase(), value);
      },
    },
  };
};

const createBrowserSaveEvent = ({
  cookie,
  gameSlug = "lands-of-lore",
  headers = {},
}: {
  cookie?: string;
  gameSlug?: string;
  headers?: Record<string, string>;
} = {}) => {
  const response = createResponseMock();

  return {
    event: {
      context: {
        params: {
          gameSlug,
        },
      },
      node: {
        req: {
          headers: {
            ...(cookie ? { cookie } : {}),
            host: "games.test",
            ...headers,
          },
          originalUrl: `/api/dos-browser-saves/${gameSlug}`,
        },
        res: response.res,
      },
    } as unknown as H3Event,
    responseHeaders: response.headers,
  };
};

const expectStatusError = (callback: () => void, statusCode: number) => {
  let error: unknown;

  try {
    callback();
  } catch (caughtError) {
    error = caughtError;
  }

  expect(error).toMatchObject({ statusCode });
};

describe("dos save browser session", () => {
  let previousSecret: string | undefined;

  beforeEach(() => {
    previousSecret = process.env.DOS_SAVE_SESSION_SECRET;
    process.env.DOS_SAVE_SESSION_SECRET = "local-session-secret";
  });

  afterEach(() => {
    if (previousSecret === undefined) {
      Reflect.deleteProperty(process.env, "DOS_SAVE_SESSION_SECRET");
    } else {
      process.env.DOS_SAVE_SESSION_SECRET = previousSecret;
    }
  });

  it("round-trips a signed session cookie value", () => {
    const cookieValue = createDosSaveSessionCookieValue("0123456789abcdef01234567", "secret");

    expect(parseDosSaveSessionCookieValue(cookieValue, "secret")).toBe("0123456789abcdef01234567");
    expect(parseDosSaveSessionCookieValue(cookieValue, "other-secret")).toBeNull();
    expect(
      parseDosSaveSessionCookieValue(cookieValue.replace("v1.", "v1.deadbeef"), "secret"),
    ).toBeNull();
  });

  it("creates an HTTP-only session cookie when none exists", () => {
    const { event, responseHeaders } = createBrowserSaveEvent();
    const session = getOrCreateDosSaveBrowserSession(event);
    const setCookieHeader = responseHeaders.get("set-cookie");

    expect(session).toEqual({
      id: expect.stringMatching(/^[a-f0-9]{24}$/),
      isNew: true,
    });
    expect(setCookieHeader).toContain(`${dosSaveSessionCookieName}=v1.`);
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("Max-Age=31536000");
    expect(setCookieHeader).toContain("SameSite=Lax");
  });

  it("reuses an existing valid session cookie", () => {
    const sessionId = "abcdefabcdefabcdefabcdef";
    const cookieValue = createDosSaveSessionCookieValue(sessionId, "local-session-secret");
    const { event, responseHeaders } = createBrowserSaveEvent({
      cookie: `${dosSaveSessionCookieName}=${cookieValue}`,
    });

    expect(getOrCreateDosSaveBrowserSession(event)).toEqual({
      id: sessionId,
      isNew: false,
    });
    expect(responseHeaders.get("set-cookie")).toBeUndefined();
  });

  it("rejects unconfigured or placeholder session secrets", () => {
    process.env.DOS_SAVE_SESSION_SECRET = "";

    expectStatusError(() => getOrCreateDosSaveBrowserSession(createBrowserSaveEvent().event), 503);

    process.env.DOS_SAVE_SESSION_SECRET = "change-me-with-a-long-random-secret";

    expectStatusError(() => getOrCreateDosSaveBrowserSession(createBrowserSaveEvent().event), 503);
  });

  it("resolves a browser-scoped save descriptor for an available game", () => {
    const sessionId = "abcdefabcdefabcdefabcdef";
    const cookieValue = createDosSaveSessionCookieValue(sessionId, "local-session-secret");
    const { event } = createBrowserSaveEvent({
      cookie: `${dosSaveSessionCookieName}=${cookieValue}`,
    });

    expect(resolveBrowserDosSaveDescriptor(event)).toEqual({
      gameSlug: "lands-of-lore",
      slotId: `browser-${sessionId}`,
    });
  });

  it("rejects unknown and placeholder games for browser saves", () => {
    expectStatusError(
      () => resolveBrowserDosSaveDescriptor(createBrowserSaveEvent({ gameSlug: "unknown" }).event),
      404,
    );
    expectStatusError(
      () => resolveBrowserDosSaveDescriptor(createBrowserSaveEvent({ gameSlug: "doom" }).event),
      404,
    );
  });

  it("allows same-origin write requests", () => {
    const { event } = createBrowserSaveEvent({
      headers: {
        origin: "https://games.test",
        "sec-fetch-site": "same-origin",
        "x-forwarded-proto": "https",
      },
    });

    expect(() => requireSameOriginDosSaveRequest(event)).not.toThrow();
  });

  it("rejects cross-site write requests", () => {
    expectStatusError(
      () =>
        requireSameOriginDosSaveRequest(
          createBrowserSaveEvent({
            headers: {
              origin: "https://evil.test",
              "x-forwarded-proto": "https",
            },
          }).event,
        ),
      403,
    );
    expectStatusError(
      () =>
        requireSameOriginDosSaveRequest(
          createBrowserSaveEvent({
            headers: {
              "sec-fetch-site": "cross-site",
            },
          }).event,
        ),
      403,
    );
  });
});
