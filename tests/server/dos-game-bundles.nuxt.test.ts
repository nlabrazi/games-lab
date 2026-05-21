import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { H3Event } from "h3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDosGameBundle, setDosGameBundleHeaders } from "../../server/utils/dos-game-bundles";

const createBundleEvent = (requestedPath: string) =>
  ({
    context: {
      params: {
        path: requestedPath,
      },
    },
  }) as H3Event;

describe("dos game bundle utils", () => {
  let rootDirectory: string;
  let previousDosGamesDir: string | undefined;

  beforeEach(async () => {
    previousDosGamesDir = process.env.DOS_GAMES_DIR;
    rootDirectory = await mkdtemp(join(tmpdir(), "games-lab-dos-"));
    process.env.DOS_GAMES_DIR = rootDirectory;
  });

  afterEach(async () => {
    if (previousDosGamesDir === undefined) {
      Reflect.deleteProperty(process.env, "DOS_GAMES_DIR");
    } else {
      process.env.DOS_GAMES_DIR = previousDosGamesDir;
    }

    await rm(rootDirectory, { recursive: true, force: true });
  });

  it("resolves an existing .jsdos bundle inside the configured directory", async () => {
    const bundlePath = join(rootDirectory, "lands-of-lore.jsdos");
    await writeFile(bundlePath, "bundle-content");

    await expect(resolveDosGameBundle(createBundleEvent("lands-of-lore.jsdos"))).resolves.toEqual({
      filePath: bundlePath,
      size: 14,
    });
  });

  it("rejects unsupported bundle extensions", async () => {
    await expect(resolveDosGameBundle(createBundleEvent("doom.zip"))).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("rejects path traversal attempts before reading the file", async () => {
    await expect(resolveDosGameBundle(createBundleEvent("../secret.jsdos"))).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("returns a 404 when the requested bundle is missing", async () => {
    await expect(resolveDosGameBundle(createBundleEvent("missing.jsdos"))).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("sets stable download headers for bundle responses", () => {
    const setHeader = vi.fn();
    const event = {
      node: {
        res: {
          setHeader,
        },
      },
    } as unknown as H3Event;

    setDosGameBundleHeaders(event, 42);

    expect(setHeader).toHaveBeenCalledWith("content-type", "application/octet-stream");
    expect(setHeader).toHaveBeenCalledWith("content-length", "42");
    expect(setHeader).toHaveBeenCalledWith("cache-control", "public, max-age=3600");
  });
});
