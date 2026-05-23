import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, createRouter, defineEventHandler, toNodeListener } from "h3";
import { fetchNodeRequestHandler } from "node-mock-http";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createDosAuthSessionCookieValue } from "../../server/utils/dos-auth";

const apiOrigin = "http://games.test";
const sessionSecret = "local-session-secret";
const savePayload = new Uint8Array([0, 1, 2, 3, 255]);

const loadSaveHandlers = async () => {
  vi.stubGlobal("defineEventHandler", defineEventHandler);

  const [getModule, headModule, putModule, deleteModule] = await Promise.all([
    import("../../server/api/dos-user-saves/[gameSlug].get"),
    import("../../server/api/dos-user-saves/[gameSlug].head"),
    import("../../server/api/dos-user-saves/[gameSlug].put"),
    import("../../server/api/dos-user-saves/[gameSlug].delete"),
  ]);

  return {
    getHandler: getModule.default,
    headHandler: headModule.default,
    putHandler: putModule.default,
    deleteHandler: deleteModule.default,
  };
};

let saveHandlers: Awaited<ReturnType<typeof loadSaveHandlers>>;

const createSavesApiFetch = () => {
  const app = createApp();
  const router = createRouter()
    .get("/api/dos-user-saves/:gameSlug", saveHandlers.getHandler)
    .head("/api/dos-user-saves/:gameSlug", saveHandlers.headHandler)
    .put("/api/dos-user-saves/:gameSlug", saveHandlers.putHandler)
    .delete("/api/dos-user-saves/:gameSlug", saveHandlers.deleteHandler);

  app.use(router.handler);

  const nodeHandler = toNodeListener(app);

  return (path: string, options: RequestInit = {}) =>
    fetchNodeRequestHandler(nodeHandler, `${apiOrigin}${path}`, options);
};

const createAuthCookie = (username: "admin" | "guest") =>
  `games_lab_dos_auth=${createDosAuthSessionCookieValue(
    username,
    Date.now() + 60_000,
    sessionSecret,
  )}`;

const createPutHeaders = (cookie?: string, contentType = "application/octet-stream") => ({
  ...(cookie ? { cookie } : {}),
  "content-type": contentType,
  origin: apiOrigin,
  "sec-fetch-site": "same-origin",
});

const expectSaveFile = async (rootDirectory: string, slotId: string, payload: Uint8Array) => {
  const filePath = join(rootDirectory, "lands-of-lore", `${slotId}.save`);
  const storedPayload = await readFile(filePath);

  expect(storedPayload).toEqual(Buffer.from(payload));
};

describe("dos user saves API routes", () => {
  let rootDirectory: string;
  let previousDosSavesDir: string | undefined;
  let previousSessionSecret: string | undefined;

  beforeAll(async () => {
    saveHandlers = await loadSaveHandlers();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    previousDosSavesDir = process.env.DOS_SAVES_DIR;
    previousSessionSecret = process.env.DOS_AUTH_SESSION_SECRET;
    rootDirectory = await mkdtemp(join(tmpdir(), "games-lab-dos-user-saves-"));
    process.env.DOS_SAVES_DIR = rootDirectory;
    process.env.DOS_AUTH_SESSION_SECRET = sessionSecret;
  });

  afterEach(async () => {
    if (previousDosSavesDir === undefined) {
      Reflect.deleteProperty(process.env, "DOS_SAVES_DIR");
    } else {
      process.env.DOS_SAVES_DIR = previousDosSavesDir;
    }

    if (previousSessionSecret === undefined) {
      Reflect.deleteProperty(process.env, "DOS_AUTH_SESSION_SECRET");
    } else {
      process.env.DOS_AUTH_SESSION_SECRET = previousSessionSecret;
    }

    await rm(rootDirectory, { recursive: true, force: true });
  });

  it("rejects anonymous save writes", async () => {
    const apiFetch = createSavesApiFetch();
    const response = await apiFetch("/api/dos-user-saves/lands-of-lore", {
      method: "PUT",
      headers: createPutHeaders(),
      body: savePayload,
    });

    expect(response.status).toBe(401);
  });

  it("writes admin saves to the admin-scoped slot", async () => {
    const apiFetch = createSavesApiFetch();
    const response = await apiFetch("/api/dos-user-saves/lands-of-lore", {
      method: "PUT",
      headers: createPutHeaders(createAuthCookie("admin")),
      body: savePayload,
    });

    await expect(response.json()).resolves.toMatchObject({
      saved: true,
      gameSlug: "lands-of-lore",
      size: savePayload.byteLength,
    });
    expect(response.status).toBe(200);
    await expectSaveFile(rootDirectory, "user-admin", savePayload);
  });

  it("writes guest saves to the guest-scoped slot", async () => {
    const apiFetch = createSavesApiFetch();
    const guestPayload = new Uint8Array([10, 20, 30]);
    const response = await apiFetch("/api/dos-user-saves/lands-of-lore", {
      method: "PUT",
      headers: createPutHeaders(createAuthCookie("guest")),
      body: guestPayload,
    });

    expect(response.status).toBe(200);
    await expectSaveFile(rootDirectory, "user-guest", guestPayload);
  });

  it("reads only the save owned by the authenticated account", async () => {
    const apiFetch = createSavesApiFetch();
    const adminCookie = createAuthCookie("admin");
    const guestCookie = createAuthCookie("guest");
    const adminPayload = new Uint8Array([1, 1, 1]);
    const guestPayload = new Uint8Array([2, 2, 2]);

    await apiFetch("/api/dos-user-saves/lands-of-lore", {
      method: "PUT",
      headers: createPutHeaders(adminCookie),
      body: adminPayload,
    });
    await apiFetch("/api/dos-user-saves/lands-of-lore", {
      method: "PUT",
      headers: createPutHeaders(guestCookie),
      body: guestPayload,
    });

    const adminResponse = await apiFetch("/api/dos-user-saves/lands-of-lore", {
      headers: {
        cookie: adminCookie,
      },
    });
    const guestResponse = await apiFetch("/api/dos-user-saves/lands-of-lore", {
      headers: {
        cookie: guestCookie,
      },
    });

    expect(Buffer.from(await adminResponse.arrayBuffer())).toEqual(Buffer.from(adminPayload));
    expect(Buffer.from(await guestResponse.arrayBuffer())).toEqual(Buffer.from(guestPayload));
  });

  it("rejects placeholder games", async () => {
    const apiFetch = createSavesApiFetch();
    const response = await apiFetch("/api/dos-user-saves/doom", {
      method: "PUT",
      headers: createPutHeaders(createAuthCookie("admin")),
      body: savePayload,
    });

    expect(response.status).toBe(404);
  });

  it("rejects unsupported save content types", async () => {
    const apiFetch = createSavesApiFetch();
    const response = await apiFetch("/api/dos-user-saves/lands-of-lore", {
      method: "PUT",
      headers: createPutHeaders(createAuthCookie("admin"), "application/json"),
      body: "{}",
    });

    expect(response.status).toBe(415);
  });

  it("rejects empty save payloads", async () => {
    const apiFetch = createSavesApiFetch();
    const response = await apiFetch("/api/dos-user-saves/lands-of-lore", {
      method: "PUT",
      headers: createPutHeaders(createAuthCookie("admin")),
      body: new Uint8Array(),
    });

    expect(response.status).toBe(400);
  });
});
