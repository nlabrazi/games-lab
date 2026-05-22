import { sendNoContent, setHeader } from "h3";
import { requireDosSaveApiAccess } from "../../../utils/dos-save-auth";
import { resolveDosSaveDescriptor } from "../../../utils/dos-save-requests";
import { deleteDosSave } from "../../../utils/dos-save-storage";

export default defineEventHandler(async (event) => {
  requireDosSaveApiAccess(event);

  const descriptor = resolveDosSaveDescriptor(event);
  await deleteDosSave(event, descriptor);

  setHeader(event, "cache-control", "no-store");

  return sendNoContent(event);
});
