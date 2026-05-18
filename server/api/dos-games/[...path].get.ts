import { createReadStream } from "node:fs";
import { sendStream } from "h3";
import { resolveDosGameBundle, setDosGameBundleHeaders } from "../../utils/dos-game-bundles";

export default defineEventHandler(async (event) => {
  const { filePath, size } = await resolveDosGameBundle(event);
  setDosGameBundleHeaders(event, size);

  return sendStream(event, createReadStream(filePath));
});
