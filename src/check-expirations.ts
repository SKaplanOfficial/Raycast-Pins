import { getPreferenceValues } from "@raycast/api";
import { updateRecentApplications } from "./lib/LocalData";
import { checkExpirations } from "./lib/Pins";
import { ExtensionPreferences } from "./lib/utils";
import { checkDelayedExecutions } from "./lib/scheduled-execution";

export default async function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  if (preferences.showRecentApplications) {
    await updateRecentApplications();
  }
  await checkDelayedExecutions();
  await checkExpirations();
}
