import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { type H3Event, createError, deleteCookie, getCookie, setCookie } from "h3";

const scrypt = promisify(scryptCallback);

const allowedUsernames = ["admin", "guest"] as const;
const sessionCookieName = "games_lab_dos_auth";
const sessionVersion = "v1";
const sessionMaxAge = 60 * 60 * 24 * 7;
const passwordHashPrefix = "scrypt";
const passwordKeyLength = 64;
const placeholderValues = new Set([
  "change-me-with-a-long-random-secret",
  "generate-with-npm-run-auth-hash",
]);

export type DosAuthUsername = (typeof allowedUsernames)[number];

export interface DosAuthUser {
  username: DosAuthUsername;
}

const normalizeUsername = (username: unknown): DosAuthUsername | null => {
  if (typeof username !== "string") {
    return null;
  }

  const normalizedUsername = username.trim().toLowerCase();

  return allowedUsernames.find((allowedUsername) => allowedUsername === normalizedUsername) ?? null;
};

const isConfiguredSecret = (value: string) => value.length > 0 && !placeholderValues.has(value);

const getRuntimeString = (value: unknown) => (typeof value === "string" ? value : "");

const getSessionSecret = (event: H3Event) => {
  const config = useRuntimeConfig(event);
  return getRuntimeString(process.env.DOS_AUTH_SESSION_SECRET ?? config.dosAuthSessionSecret);
};

const requireSessionSecret = (event: H3Event) => {
  const secret = getSessionSecret(event);

  if (!isConfiguredSecret(secret)) {
    throw createError({
      statusCode: 503,
      statusMessage: "Authentification MS-DOS non configuree",
    });
  }

  return secret;
};

const getPasswordHash = (event: H3Event, username: DosAuthUsername) => {
  const config = useRuntimeConfig(event);

  return username === "admin"
    ? getRuntimeString(process.env.DOS_AUTH_ADMIN_PASSWORD_HASH ?? config.dosAuthAdminPasswordHash)
    : getRuntimeString(process.env.DOS_AUTH_GUEST_PASSWORD_HASH ?? config.dosAuthGuestPasswordHash);
};

const isConfiguredPasswordHash = (passwordHash: string) =>
  passwordHash.startsWith(`${passwordHashPrefix}:`) && !placeholderValues.has(passwordHash);

const derivePasswordKey = async (password: string, salt: string) => {
  const derivedKey = await scrypt(password, salt, passwordKeyLength);
  return Buffer.isBuffer(derivedKey) ? derivedKey : Buffer.from(derivedKey);
};

export const createDosPasswordHash = async (password: string) => {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await derivePasswordKey(password, salt);

  return `${passwordHashPrefix}:${salt}:${derivedKey.toString("base64url")}`;
};

export const verifyDosPasswordHash = async (password: string, passwordHash: string) => {
  const [algorithm, salt, expectedHash] = passwordHash.split(":");

  if (algorithm !== passwordHashPrefix || !salt || !expectedHash) {
    return false;
  }

  const derivedKey = await derivePasswordKey(password, salt);
  const expectedKey = Buffer.from(expectedHash, "base64url");

  if (derivedKey.length !== expectedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expectedKey);
};

const signSession = (username: DosAuthUsername, expiresAt: number, secret: string) =>
  createHmac("sha256", secret)
    .update(`${sessionVersion}.${username}.${expiresAt}`)
    .digest("base64url");

const compareSignatures = (receivedSignature: string, expectedSignature: string) => {
  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
};

export const createDosAuthSessionCookieValue = (
  username: DosAuthUsername,
  expiresAt: number,
  secret: string,
) => `${sessionVersion}.${username}.${expiresAt}.${signSession(username, expiresAt, secret)}`;

export const parseDosAuthSessionCookieValue = (
  cookieValue: string | undefined,
  secret: string,
  now = Date.now(),
): DosAuthUser | null => {
  const [version, username, expiresAtValue, signature] = cookieValue?.split(".") ?? [];
  const normalizedUsername = normalizeUsername(username);
  const expiresAt = Number(expiresAtValue);

  if (
    version !== sessionVersion ||
    !normalizedUsername ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= now ||
    !signature
  ) {
    return null;
  }

  const expectedSignature = signSession(normalizedUsername, expiresAt, secret);

  if (!compareSignatures(signature, expectedSignature)) {
    return null;
  }

  return {
    username: normalizedUsername,
  };
};

export const getOptionalDosAuthUser = (event: H3Event): DosAuthUser | null => {
  const secret = getSessionSecret(event);

  if (!isConfiguredSecret(secret)) {
    return null;
  }

  return parseDosAuthSessionCookieValue(getCookie(event, sessionCookieName), secret);
};

export const requireDosAuthUser = (event: H3Event): DosAuthUser => {
  const secret = requireSessionSecret(event);
  const user = parseDosAuthSessionCookieValue(getCookie(event, sessionCookieName), secret);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Connexion requise pour sauvegarder",
    });
  }

  return user;
};

export const authenticateDosUser = async (
  event: H3Event,
  username: unknown,
  password: unknown,
): Promise<DosAuthUser | null> => {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || typeof password !== "string") {
    return null;
  }

  const passwordHash = getPasswordHash(event, normalizedUsername);

  if (!isConfiguredPasswordHash(passwordHash)) {
    throw createError({
      statusCode: 503,
      statusMessage: "Compte MS-DOS non configure",
    });
  }

  const isValidPassword = await verifyDosPasswordHash(password, passwordHash);

  return isValidPassword ? { username: normalizedUsername } : null;
};

export const setDosAuthSessionCookie = (event: H3Event, user: DosAuthUser) => {
  const secret = requireSessionSecret(event);
  const expiresAt = Date.now() + sessionMaxAge * 1000;

  setCookie(
    event,
    sessionCookieName,
    createDosAuthSessionCookieValue(user.username, expiresAt, secret),
    {
      httpOnly: true,
      maxAge: sessionMaxAge,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );
};

export const clearDosAuthSessionCookie = (event: H3Event) => {
  deleteCookie(event, sessionCookieName, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
};
