type LogLevel = "debug" | "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

const env =
  (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } })
    .process?.env ?? {};

const APP_NAME = env.NUXT_LOG_APP_NAME ?? env.APP_NAME ?? "games-lab";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = normalizeLevel(env.NUXT_LOG_LEVEL) ?? "info";

function normalizeLevel(level: string | undefined): LogLevel | undefined {
  if (level === "debug" || level === "info" || level === "warn" || level === "error") {
    return level;
  }

  return undefined;
}

function shouldLog(level: LogLevel) {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[configuredLevel];
}

function cleanPayload(payload: LogPayload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null),
  );
}

function writeLog(level: LogLevel, payload: LogPayload) {
  if (!shouldLog(level)) {
    return;
  }

  const entry = cleanPayload({
    app: APP_NAME,
    level,
    timestamp: new Date().toISOString(),
    ...payload,
  });

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return cleanPayload({
      error: String(error),
      errorName: error.name,
      errorMessage: error.message,
      errorStack: env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }

  return {
    error: String(error),
  };
}

export const logger = {
  debug: (payload: LogPayload) => writeLog("debug", payload),
  info: (payload: LogPayload) => writeLog("info", payload),
  warn: (payload: LogPayload) => writeLog("warn", payload),
  error: (payload: LogPayload) => writeLog("error", payload),
};
