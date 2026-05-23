import type { H3Event } from "h3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authenticateDosUser,
  createDosAuthSessionCookieValue,
  createDosPasswordHash,
  getOptionalDosAuthUser,
  parseDosAuthSessionCookieValue,
  requireDosAuthUser,
  setDosAuthSessionCookie,
  verifyDosPasswordHash,
} from "../../server/utils/dos-auth";

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

const createAuthEvent = (cookie?: string) => {
  const response = createResponseMock();

  return {
    event: {
      context: {},
      node: {
        req: {
          headers: cookie ? { cookie } : {},
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

describe("dos auth", () => {
  let previousAdminHash: string | undefined;
  let previousGuestHash: string | undefined;
  let previousSessionSecret: string | undefined;

  beforeEach(() => {
    previousAdminHash = process.env.DOS_AUTH_ADMIN_PASSWORD_HASH;
    previousGuestHash = process.env.DOS_AUTH_GUEST_PASSWORD_HASH;
    previousSessionSecret = process.env.DOS_AUTH_SESSION_SECRET;
    process.env.DOS_AUTH_SESSION_SECRET = "local-session-secret";
  });

  afterEach(() => {
    if (previousAdminHash === undefined) {
      Reflect.deleteProperty(process.env, "DOS_AUTH_ADMIN_PASSWORD_HASH");
    } else {
      process.env.DOS_AUTH_ADMIN_PASSWORD_HASH = previousAdminHash;
    }

    if (previousGuestHash === undefined) {
      Reflect.deleteProperty(process.env, "DOS_AUTH_GUEST_PASSWORD_HASH");
    } else {
      process.env.DOS_AUTH_GUEST_PASSWORD_HASH = previousGuestHash;
    }

    if (previousSessionSecret === undefined) {
      Reflect.deleteProperty(process.env, "DOS_AUTH_SESSION_SECRET");
    } else {
      process.env.DOS_AUTH_SESSION_SECRET = previousSessionSecret;
    }
  });

  it("creates and verifies scrypt password hashes", async () => {
    const passwordHash = await createDosPasswordHash("correct-password");

    await expect(verifyDosPasswordHash("correct-password", passwordHash)).resolves.toBe(true);
    await expect(verifyDosPasswordHash("wrong-password", passwordHash)).resolves.toBe(false);
  });

  it("authenticates only configured admin and guest accounts", async () => {
    process.env.DOS_AUTH_ADMIN_PASSWORD_HASH = await createDosPasswordHash("admin-password");
    process.env.DOS_AUTH_GUEST_PASSWORD_HASH = await createDosPasswordHash("guest-password");

    await expect(
      authenticateDosUser(createAuthEvent().event, "admin", "admin-password"),
    ).resolves.toEqual({ username: "admin" });
    await expect(
      authenticateDosUser(createAuthEvent().event, "guest", "guest-password"),
    ).resolves.toEqual({ username: "guest" });
    await expect(
      authenticateDosUser(createAuthEvent().event, "unknown", "admin-password"),
    ).resolves.toBeNull();
    await expect(
      authenticateDosUser(createAuthEvent().event, "admin", "wrong-password"),
    ).resolves.toBeNull();
  });

  it("rejects login when a requested account is not configured", async () => {
    process.env.DOS_AUTH_ADMIN_PASSWORD_HASH = "generate-with-npm-run-auth-hash";

    await expect(
      authenticateDosUser(createAuthEvent().event, "admin", "admin-password"),
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  it("round-trips a signed auth session cookie", () => {
    const expiresAt = Date.now() + 60_000;
    const cookieValue = createDosAuthSessionCookieValue("admin", expiresAt, "secret");

    expect(parseDosAuthSessionCookieValue(cookieValue, "secret")).toEqual({
      username: "admin",
    });
    expect(parseDosAuthSessionCookieValue(cookieValue, "other-secret")).toBeNull();
    expect(parseDosAuthSessionCookieValue(cookieValue, "secret", expiresAt + 1)).toBeNull();
  });

  it("sets an HTTP-only auth session cookie", () => {
    const { event, responseHeaders } = createAuthEvent();

    setDosAuthSessionCookie(event, { username: "guest" });

    const setCookieHeader = responseHeaders.get("set-cookie");

    expect(setCookieHeader).toContain("games_lab_dos_auth=v1.guest.");
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("Max-Age=604800");
    expect(setCookieHeader).toContain("SameSite=Lax");
  });

  it("reads an authenticated user from a valid cookie", () => {
    const expiresAt = Date.now() + 60_000;
    const cookieValue = createDosAuthSessionCookieValue("admin", expiresAt, "local-session-secret");
    const { event } = createAuthEvent(`games_lab_dos_auth=${cookieValue}`);

    expect(getOptionalDosAuthUser(event)).toEqual({ username: "admin" });
    expect(requireDosAuthUser(event)).toEqual({ username: "admin" });
  });

  it("rejects missing auth sessions", () => {
    expect(getOptionalDosAuthUser(createAuthEvent().event)).toBeNull();
    expectStatusError(() => requireDosAuthUser(createAuthEvent().event), 401);
  });

  it("rejects unconfigured session secrets for required auth", () => {
    process.env.DOS_AUTH_SESSION_SECRET = "";

    expect(getOptionalDosAuthUser(createAuthEvent().event)).toBeNull();
    expectStatusError(() => requireDosAuthUser(createAuthEvent().event), 503);
  });
});
