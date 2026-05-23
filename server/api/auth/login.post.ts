import { createError, readBody } from "h3";
import { authenticateDosUser, setDosAuthSessionCookie } from "../../utils/dos-auth";
import { requireSameOriginRequest } from "../../utils/request-origin";

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

export default defineEventHandler(async (event) => {
  requireSameOriginRequest(event);

  const body = await readBody<LoginBody>(event);
  const user = await authenticateDosUser(event, body.username, body.password);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Identifiants invalides",
    });
  }

  setDosAuthSessionCookie(event, user);

  return {
    authenticated: true,
    user,
  };
});
