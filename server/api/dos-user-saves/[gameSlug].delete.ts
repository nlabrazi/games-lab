import { sendNoContent, setHeader } from "h3";
import { deleteDosSave } from "../../utils/dos-save-storage";
import { resolveUserDosSaveDescriptor } from "../../utils/dos-user-save-requests";
import { requireSameOriginRequest } from "../../utils/request-origin";

export default defineEventHandler(async (event) => {
  requireSameOriginRequest(event);

  const descriptor = resolveUserDosSaveDescriptor(event);
  await deleteDosSave(event, descriptor);

  setHeader(event, "cache-control", "no-store");

  return sendNoContent(event);
});
