import { getRequestHeader } from "h3";

const requestStartedAtKey = "requestStartedAt";

function shouldSkipRequestLog(route: string, statusCode: number) {
  if (statusCode >= 400) {
    return false;
  }

  return (
    route.startsWith("/_nuxt/") ||
    route.startsWith("/static-games/") ||
    route === "/favicon.ico" ||
    route === "/robots.txt"
  );
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    event.context[requestStartedAtKey] = performance.now();
  });

  nitroApp.hooks.hook("beforeResponse", (event) => {
    const route = event.path;
    const statusCode = event.node.res.statusCode;

    if (shouldSkipRequestLog(route, statusCode)) {
      return;
    }

    const startedAt = event.context[requestStartedAtKey];
    const durationMs =
      typeof startedAt === "number" ? Math.round(performance.now() - startedAt) : undefined;
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

    logger[level]({
      route,
      method: event.method,
      statusCode,
      durationMs,
      requestId: getRequestHeader(event, "x-request-id"),
      message: "HTTP request completed",
    });
  });

  nitroApp.hooks.hook("error", (error, context) => {
    const event = context.event;

    logger.error({
      route: event?.path,
      method: event?.method,
      statusCode: event?.node.res.statusCode,
      requestId: event ? getRequestHeader(event, "x-request-id") : undefined,
      message: "Unhandled server error",
      ...serializeError(error),
    });
  });
});
