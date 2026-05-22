import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  type H3Event,
  createError,
  getCookie,
  getRequestHeader,
  getRequestURL,
  getRouterParam,
  setCookie,
} from "h3";
import { findDosGame } from "../../app/data/dosGames";
import type { DosSaveDescriptor } from "./dos-save-storage";

export const dosSaveSessionCookieName = "games_lab_dos_save_session";
export const dosSaveSessionMaxAge = 60 * 60 * 24 * 365;

const cookieVersion = "v1";
const placeholderSecrets = new Set(["change-me-with-a-long-random-secret"]);
const sessionIdPattern = /^[a-f0-9]{24}$/;

export interface DosSaveBrowserSession {
  id: string;
  isNew: boolean;
}

const getSessionSecret = (event: H3Event) => {
  const config = useRuntimeConfig(event);
  return String(process.env.DOS_SAVE_SESSION_SECRET ?? config.dosSaveSessionSecret ?? "");
};

const requireSessionSecret = (event: H3Event) => {
  const secret = getSessionSecret(event);

  if (!secret || placeholderSecrets.has(secret)) {
    throw createError({
      statusCode: 503,
      statusMessage: "Sessions de sauvegarde MS-DOS non configurees",
    });
  }

  return secret;
};

const signSessionId = (sessionId: string, secret: string) =>
  createHmac("sha256", secret).update(`${cookieVersion}.${sessionId}`).digest("base64url");

const compareSignatures = (receivedSignature: string, expectedSignature: string) => {
  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
};

export const createDosSaveSessionCookieValue = (sessionId: string, secret: string) =>
  `${cookieVersion}.${sessionId}.${signSessionId(sessionId, secret)}`;

export const parseDosSaveSessionCookieValue = (cookieValue: string | undefined, secret: string) => {
  const [version, sessionId, signature] = cookieValue?.split(".") ?? [];

  if (version !== cookieVersion || !sessionIdPattern.test(sessionId ?? "") || !signature) {
    return null;
  }

  const expectedSignature = signSessionId(sessionId, secret);

  if (!compareSignatures(signature, expectedSignature)) {
    return null;
  }

  return sessionId;
};

const createSessionId = () => randomBytes(12).toString("hex");

const persistSessionCookie = (event: H3Event, sessionId: string, secret: string) => {
  setCookie(event, dosSaveSessionCookieName, createDosSaveSessionCookieValue(sessionId, secret), {
    httpOnly: true,
    maxAge: dosSaveSessionMaxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
};

export const getOrCreateDosSaveBrowserSession = (event: H3Event): DosSaveBrowserSession => {
  const secret = requireSessionSecret(event);
  const existingSessionId = parseDosSaveSessionCookieValue(
    getCookie(event, dosSaveSessionCookieName),
    secret,
  );

  if (existingSessionId) {
    return {
      id: existingSessionId,
      isNew: false,
    };
  }

  const sessionId = createSessionId();
  persistSessionCookie(event, sessionId, secret);

  return {
    id: sessionId,
    isNew: true,
  };
};

export const requireSameOriginDosSaveRequest = (event: H3Event) => {
  const fetchSite = getRequestHeader(event, "sec-fetch-site");

  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Origine de sauvegarde MS-DOS refusee",
    });
  }

  const origin = getRequestHeader(event, "origin");

  if (!origin) {
    return;
  }

  if (origin !== getRequestURL(event).origin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Origine de sauvegarde MS-DOS refusee",
    });
  }
};

export const resolveBrowserDosSaveDescriptor = (event: H3Event): Required<DosSaveDescriptor> => {
  const gameSlug = getRouterParam(event, "gameSlug") ?? "";
  const game = findDosGame(gameSlug);

  if (!game || game.status !== "available") {
    throw createError({
      statusCode: 404,
      statusMessage: "Jeu MS-DOS introuvable",
    });
  }

  const session = getOrCreateDosSaveBrowserSession(event);

  return {
    gameSlug: game.slug,
    slotId: `browser-${session.id}`,
  };
};
