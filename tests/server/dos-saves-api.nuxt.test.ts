import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { H3Event } from "h3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDosSaveMetadata, readDosSave, writeDosSave } from "../../server/utils/dos-save-storage";

const createMockEvent = () => ({}) as H3Event;

describe("dos-save-storage", () => {
  let rootDirectory: string;
  let previousDosSavesDir: string | undefined;

  beforeEach(async () => {
    previousDosSavesDir = process.env.DOS_SAVES_DIR;
    rootDirectory = await mkdtemp(join(tmpdir(), "games-lab-saves-"));
    process.env.DOS_SAVES_DIR = rootDirectory;
  });

  afterEach(async () => {
    if (previousDosSavesDir === undefined) {
      Reflect.deleteProperty(process.env, "DOS_SAVES_DIR");
    } else {
      process.env.DOS_SAVES_DIR = previousDosSavesDir;
    }

    await rm(rootDirectory, { recursive: true, force: true });
  });

  it("writes and reads back a save file atomically", async () => {
    const event = createMockEvent();
    const gameSlug = "lands-of-lore";
    const payload = new Uint8Array([10, 20, 30, 40]);

    const metadata = await writeDosSave(event, gameSlug, payload);
    expect(metadata.size).toBe(4);

    const readBack = await readDosSave(event, gameSlug);
    expect(readBack).not.toBeNull();
    if (readBack) {
      expect(Array.from(readBack)).toEqual(Array.from(payload));
    }
  });

  it("returns null when no save exists", async () => {
    const event = createMockEvent();
    const metadata = await getDosSaveMetadata(event, "unknown-game");
    expect(metadata).toBeNull();

    const data = await readDosSave(event, "unknown-game");
    expect(data).toBeNull();
  });

  it("rejects empty save payloads", async () => {
    const event = createMockEvent();
    await expect(writeDosSave(event, "lands-of-lore", new Uint8Array([]))).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects invalid game slugs", async () => {
    const event = createMockEvent();
    await expect(writeDosSave(event, "../malicious", new Uint8Array([1, 2]))).rejects.toMatchObject(
      {
        statusCode: 400,
      },
    );
  });
});
