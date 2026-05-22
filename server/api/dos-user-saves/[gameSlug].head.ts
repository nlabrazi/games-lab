import { createError, setHeader } from "h3";
import { getDosSaveMetadata } from "../../utils/dos-save-storage";
import { resolveUserDosSaveDescriptor } from "../../utils/dos-user-save-requests";

export default defineEventHandler(async (event) => {
  const descriptor = resolveUserDosSaveDescriptor(event);
  const metadata = await getDosSaveMetadata(event, descriptor);

  if (!metadata) {
    throw createError({
      statusCode: 404,
      statusMessage: "Sauvegarde MS-DOS introuvable",
    });
  }

  setHeader(event, "content-type", "application/octet-stream");
  setHeader(event, "content-length", String(metadata.size));
  setHeader(event, "cache-control", "no-store");
  setHeader(event, "x-dos-save-updated-at", metadata.updatedAt.toISOString());

  return "";
});
