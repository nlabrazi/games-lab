import { createApp, defineEventHandler, toNodeListener } from "h3";
import { fetchNodeRequestHandler } from "node-mock-http";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createDosPasswordHash } from "../../server/utils/dos-auth";

const apiOrigin = "http://games.test";

const loadAuthHandlers = async () => {
  vi.stubGlobal("defineEventHandler", defineEventHandler);

  const [loginModule, logoutModule, sessionModule] = await Promise.all([
    import("../../server/api/auth/login.post"),
    import("../../server/api/auth/logout.post"),
    import("../../server/api/auth/session.get"),
  ]);

  return {
    loginHandler: loginModule.default,
    logoutHandler: logoutModule.default,
    sessionHandler: sessionModule.default,
  };
};

let authHandlers: Awaited<ReturnType<typeof loadAuthHandlers>>;

const createAuthApiFetch = () => {
  const app = createApp();
  app.use("/api/auth/login", authHandlers.loginHandler);
  app.use("/api/auth/logout", authHandlers.logoutHandler);
  app.use("/api/auth/session", authHandlers.sessionHandler);

  const nodeHandler = toNodeListener(app);

  return (path: string, options: RequestInit = {}) =>
    fetchNodeRequestHandler(nodeHandler, `${apiOrigin}${path}`, options);
};

const jsonHeaders = {
  "content-type": "application/json",
  origin: apiOrigin,
  "sec-fetch-site": "same-origin",
};

const createLoginBody = (username: string, password: string) =>
  JSON.stringify({
    username,
    password,
  });

const extractSetCookie = (response: Response) => {
  const setCookie = response.headers.get("set-cookie");

  expect(setCookie).toBeTruthy();

  return setCookie ?? "";
};

const extractCookieHeader = (response: Response) => extractSetCookie(response).split(";")[0];

describe("auth API routes", () => {
  let adminPasswordHash = "";
  let guestPasswordHash = "";
  let previousAdminHash: string | undefined;
  let previousGuestHash: string | undefined;
  let previousSessionSecret: string | undefined;

  beforeAll(async () => {
    authHandlers = await loadAuthHandlers();
    adminPasswordHash = await createDosPasswordHash("admin-password");
    guestPasswordHash = await createDosPasswordHash("guest-password");
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    previousAdminHash = process.env.DOS_AUTH_ADMIN_PASSWORD_HASH;
    previousGuestHash = process.env.DOS_AUTH_GUEST_PASSWORD_HASH;
    previousSessionSecret = process.env.DOS_AUTH_SESSION_SECRET;
    process.env.DOS_AUTH_ADMIN_PASSWORD_HASH = adminPasswordHash;
    process.env.DOS_AUTH_GUEST_PASSWORD_HASH = guestPasswordHash;
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

  it("logs in the configured admin account", async () => {
    const apiFetch = createAuthApiFetch();
    const response = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: createLoginBody("admin", "admin-password"),
    });

    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      user: {
        username: "admin",
      },
    });
    expect(response.status).toBe(200);
  });

  it("logs in the configured guest account", async () => {
    const apiFetch = createAuthApiFetch();
    const response = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: createLoginBody("guest", "guest-password"),
    });

    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      user: {
        username: "guest",
      },
    });
    expect(response.status).toBe(200);
  });

  it("rejects a wrong password", async () => {
    const apiFetch = createAuthApiFetch();
    const response = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: createLoginBody("admin", "wrong-password"),
    });

    expect(response.status).toBe(401);
  });

  it("sets the auth session cookie with secure browser flags", async () => {
    const apiFetch = createAuthApiFetch();
    const response = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: createLoginBody("guest", "guest-password"),
    });
    const setCookie = extractSetCookie(response);

    expect(setCookie).toContain("games_lab_dos_auth=v1.guest.");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
  });

  it("returns the authenticated user from the session route", async () => {
    const apiFetch = createAuthApiFetch();
    const loginResponse = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: createLoginBody("admin", "admin-password"),
    });
    const cookie = extractCookieHeader(loginResponse);
    const sessionResponse = await apiFetch("/api/auth/session", {
      headers: {
        cookie,
      },
    });

    await expect(sessionResponse.json()).resolves.toEqual({
      authenticated: true,
      user: {
        username: "admin",
      },
    });
    expect(sessionResponse.status).toBe(200);
  });

  it("clears the auth session on logout", async () => {
    const apiFetch = createAuthApiFetch();
    const loginResponse = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: createLoginBody("admin", "admin-password"),
    });
    const authenticatedCookie = extractCookieHeader(loginResponse);
    const logoutResponse = await apiFetch("/api/auth/logout", {
      method: "POST",
      headers: {
        cookie: authenticatedCookie,
        origin: apiOrigin,
        "sec-fetch-site": "same-origin",
      },
    });
    const clearedCookie = extractCookieHeader(logoutResponse);
    const sessionResponse = await apiFetch("/api/auth/session", {
      headers: {
        cookie: clearedCookie,
      },
    });

    await expect(logoutResponse.json()).resolves.toEqual({
      authenticated: false,
      user: null,
    });
    expect(logoutResponse.status).toBe(200);
    expect(extractSetCookie(logoutResponse)).toContain("Max-Age=0");
    await expect(sessionResponse.json()).resolves.toEqual({
      authenticated: false,
      user: null,
    });
  });
});
