import { createHash, timingSafeEqual } from "node:crypto";
import { type H3Event, createError, getRequestHeader } from "h3";

const placeholderTokens = new Set(["change-me-with-a-long-random-secret"]);

const getExpectedDosSaveToken = (event: H3Event) => {
  const config = useRuntimeConfig(event);
  return String(process.env.DOS_SAVES_API_TOKEN ?? config.dosSavesApiToken ?? "");
};

const extractBearerToken = (authorizationHeader: string | undefined) => {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
};

const compareTokens = (receivedToken: string, expectedToken: string) => {
  const receivedDigest = createHash("sha256").update(receivedToken).digest();
  const expectedDigest = createHash("sha256").update(expectedToken).digest();

  return timingSafeEqual(receivedDigest, expectedDigest);
};

export const requireDosSaveApiAccess = (event: H3Event) => {
  const expectedToken = getExpectedDosSaveToken(event);

  if (!expectedToken || placeholderTokens.has(expectedToken)) {
    throw createError({
      statusCode: 503,
      statusMessage: "API de sauvegardes MS-DOS non configuree",
    });
  }

  const receivedToken = extractBearerToken(getRequestHeader(event, "authorization"));

  if (!receivedToken || !compareTokens(receivedToken, expectedToken)) {
    throw createError({
      statusCode: 401,
      statusMessage: "Acces aux sauvegardes MS-DOS refuse",
    });
  }
};
