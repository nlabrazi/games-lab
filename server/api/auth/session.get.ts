import { getOptionalDosAuthUser } from "../../utils/dos-auth";

export default defineEventHandler((event) => {
  const user = getOptionalDosAuthUser(event);

  return {
    authenticated: Boolean(user),
    user,
  };
});
