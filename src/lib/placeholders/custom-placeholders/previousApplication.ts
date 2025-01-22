import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { getStorage } from "../../storage";
import { storageKeys } from "../../common";

/**
 * Placeholder for the last application focused before the current application. If there is no previous application, this placeholder will not be replaced.
 */
const PreviousApplicationPlaceholder: Placeholder = {
  name: "previousApplication",
  regex:
    /{{(previousApp|previousAppName|lastApp|lastAppName|previousApplication|lastApplication|previousApplicationName|lastApplicationName)}}/,
  rules: [
    async () => {
      try {
        const recents = await getStorage(storageKeys.recentApps);
        if (!recents) return false;
        if (!Array.isArray(recents)) return false;
        return recents.length > 1;
      } catch (e) {
        return false;
      }
    },
  ],
  apply: async () => {
    const recents = await getStorage(storageKeys.recentApps);
    if (Array.isArray(recents)) {
      return { result: recents[1].name, previousApplication: recents[1].name };
    }
    return { result: "" };
  },
  constant: true,
  result_keys: ["previousApplication"],
  fn: async () => (await PreviousApplicationPlaceholder.apply(`{{previousApplication}}`)).result,
  example: "{{previousApplication}}",
  description:
    "The last application focused before the current application. If there is no previous application, this placeholder will not be replaced.",
  hintRepresentation: "{{previousApplication}}",
  fullRepresentation: "Previous Application",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Applications],
};

export default PreviousApplicationPlaceholder;
