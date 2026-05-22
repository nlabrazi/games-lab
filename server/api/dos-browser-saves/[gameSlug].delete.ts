import { sendNoContent, setHeader } from "h3";
import {
  requireSameOriginDosSaveRequest,
  resolveBrowserDosSaveDescriptor,
} from "../../utils/dos-save-browser-session";
import { deleteDosSave } from "../../utils/dos-save-storage";

export default defineEventHandler(async (event) => {
  requireSameOriginDosSaveRequest(event);

  const descriptor = resolveBrowserDosSaveDescriptor(event);
  await deleteDosSave(event, descriptor);

  setHeader(event, "cache-control", "no-store");

  return sendNoContent(event);
});
