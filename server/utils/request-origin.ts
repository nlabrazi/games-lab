import { type H3Event, createError, getRequestHeader, getRequestURL } from "h3";

export const requireSameOriginRequest = (event: H3Event) => {
  const fetchSite = getRequestHeader(event, "sec-fetch-site");

  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Origine de requete refusee",
    });
  }

  const origin = getRequestHeader(event, "origin");

  if (!origin) {
    return;
  }

  if (origin !== getRequestURL(event).origin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Origine de requete refusee",
    });
  }
};
