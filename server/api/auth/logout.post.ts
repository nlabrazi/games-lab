import { clearDosAuthSessionCookie } from "../../utils/dos-auth";
import { requireSameOriginRequest } from "../../utils/request-origin";

export default defineEventHandler((event) => {
  requireSameOriginRequest(event);
  clearDosAuthSessionCookie(event);

  return {
    authenticated: false,
    user: null,
  };
});
