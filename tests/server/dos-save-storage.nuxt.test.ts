import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { H3Event } from "h3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  deleteDosSave,
  getDosSaveMetadata,
  maxDosSaveBytes,
  readDosSave,
  resolveDosSavePath,
  writeDosSave,
} from "../../server/utils/dos-save-storage";

const createSaveEvent = () =>
  ({
    context: {},
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

describe("dos save storage utils", () => {
  let rootDirectory: string;
  let previousDosSavesDir: string | undefined;

  beforeEach(async () => {
    previousDosSavesDir = process.env.DOS_SAVES_DIR;
    rootDirectory = await mkdtemp(join(tmpdir(), "games-lab-dos-saves-"));
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

  it("resolves a save path inside the configured storage directory", () => {
    const savePath = resolveDosSavePath(createSaveEvent(), {
      gameSlug: "lands-of-lore",
      slotId: "autosave",
    });

    expect(savePath.filePath).toBe(join(rootDirectory, "lands-of-lore", "autosave.save"));
  });

  it("rejects invalid game and slot identifiers", () => {
    const resolveInvalidGame = () =>
      resolveDosSavePath(createSaveEvent(), {
        gameSlug: "../lands-of-lore",
        slotId: "autosave",
      });

    const resolveInvalidSlot = () =>
      resolveDosSavePath(createSaveEvent(), {
        gameSlug: "lands-of-lore",
        slotId: "slot/1",
      });

    expectStatusError(resolveInvalidGame, 400);
    expectStatusError(resolveInvalidSlot, 400);
  });

  it("writes and reads a binary save file", async () => {
    const payload = Buffer.from([0, 1, 2, 255]);

    const metadata = await writeDosSave(
      createSaveEvent(),
      {
        gameSlug: "lands-of-lore",
        slotId: "autosave",
      },
      payload,
    );

    await expect(
      readDosSave(createSaveEvent(), {
        gameSlug: "lands-of-lore",
        slotId: "autosave",
      }),
    ).resolves.toEqual(payload);
    expect(metadata.size).toBe(payload.byteLength);
    expect(metadata.updatedAt).toBeInstanceOf(Date);
  });

  it("returns null when a save file does not exist", async () => {
    await expect(
      getDosSaveMetadata(createSaveEvent(), {
        gameSlug: "lands-of-lore",
        slotId: "missing",
      }),
    ).resolves.toBeNull();
  });

  it("rejects empty and oversized save files", async () => {
    await expect(
      writeDosSave(
        createSaveEvent(),
        {
          gameSlug: "lands-of-lore",
        },
        Buffer.alloc(0),
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      writeDosSave(
        createSaveEvent(),
        {
          gameSlug: "lands-of-lore",
        },
        Buffer.alloc(maxDosSaveBytes + 1),
      ),
    ).rejects.toMatchObject({ statusCode: 413 });
  });

  it("deletes an existing save file", async () => {
    await writeDosSave(
      createSaveEvent(),
      {
        gameSlug: "lands-of-lore",
      },
      Buffer.from("save-content"),
    );

    await deleteDosSave(createSaveEvent(), {
      gameSlug: "lands-of-lore",
    });

    await expect(
      getDosSaveMetadata(createSaveEvent(), {
        gameSlug: "lands-of-lore",
      }),
    ).resolves.toBeNull();
  });
});
