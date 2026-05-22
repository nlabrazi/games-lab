import { createError, getRequestHeader, readRawBody, setHeader } from "h3";
import {
  requireSameOriginDosSaveRequest,
  resolveBrowserDosSaveDescriptor,
} from "../../utils/dos-save-browser-session";
import { maxDosSaveBytes, writeDosSave } from "../../utils/dos-save-storage";

const allowedContentType = "application/octet-stream";

export default defineEventHandler(async (event) => {
  requireSameOriginDosSaveRequest(event);

  const contentType = getRequestHeader(event, "content-type")?.split(";")[0]?.trim();

  if (contentType !== allowedContentType) {
    throw createError({
      statusCode: 415,
      statusMessage: "Type de sauvegarde MS-DOS non supporte",
    });
  }

  const contentLength = Number(getRequestHeader(event, "content-length") ?? "0");

  if (Number.isFinite(contentLength) && contentLength > maxDosSaveBytes) {
    throw createError({
      statusCode: 413,
      statusMessage: "Fichier de sauvegarde trop volumineux",
    });
  }

  const payload = await readRawBody(event, false);

  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: "Fichier de sauvegarde vide",
    });
  }

  const descriptor = resolveBrowserDosSaveDescriptor(event);
  const metadata = await writeDosSave(event, descriptor, payload);

  setHeader(event, "cache-control", "no-store");

  return {
    saved: true,
    gameSlug: descriptor.gameSlug,
    size: metadata.size,
    updatedAt: metadata.updatedAt.toISOString(),
  };
});
