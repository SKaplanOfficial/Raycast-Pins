import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { getPreviousPin } from "../../pin";
import { getStorage } from "../../storage";
import { storageKeys } from "../../common";

/**
 * Placeholder for the url-encoded target of the most recently opened pin before the current one.
 */
const PreviousPinTargetPlaceholder: Placeholder = {
  name: "previousPinTarget",
  regex: /{{(previousPinTarget|lastPinTarget|previousTarget)}}/,
  rules: [
    async () => {
      try {
        const previousPin = getStorage(storageKeys.lastOpenedPin);
        if (!previousPin) return false;
        return true;
      } catch (e) {
        return false;
      }
    },
  ],
  apply: async () => {
    try {
      const previousPinTarget = (await getPreviousPin())?.url || "";
      const res = encodeURI(previousPinTarget);
      return { result: res, previousPinTarget: res };
    } catch (e) {
      return { result: "" };
    }
  },
  constant: true,
  result_keys: ["previousPinTarget"],
  fn: async () => (await PreviousPinTargetPlaceholder.apply(`{{previousPinTarget}}`)).result,
  example: "{{previousPinTarget}}",
  description:
    "The URL-encoded target of the most recently opened pin before the current one.",
  hintRepresentation: "{{previousPinTarget}}",
  fullRepresentation: "Last Opened Pin Target",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PreviousPinTargetPlaceholder;
