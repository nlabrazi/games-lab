import { resolveDosGameBundle, setDosGameBundleHeaders } from "../../utils/dos-game-bundles";

export default defineEventHandler(async (event) => {
  const { size } = await resolveDosGameBundle(event);
  setDosGameBundleHeaders(event, size);

  return "";
});
