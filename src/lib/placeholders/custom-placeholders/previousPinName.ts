import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { getPreviousPin } from "../../pin";
import { getStorage } from "../../storage";
import { storageKeys } from "../../common";

/**
 * Placeholder for the url-encoded name of the most recently opened pin before the current one.
 */
const PreviousPinNamePlaceholder: Placeholder = {
  name: "previousPinName",
  regex: /{{(previousPinName|lastPinName)}}/,
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
      const previousPinName = (await getPreviousPin())?.name || "";
      const res = encodeURI(previousPinName);
      return { result: res, previousPinName: res };
    } catch (e) {
      return { result: "" };
    }
  },
  constant: true,
  result_keys: ["previousPinName"],
  fn: async () => (await PreviousPinNamePlaceholder.apply(`{{previousPinName}}`)).result,
  example: "{{previousPinName}}",
  description: "The url-encoded name of the most recently opened pin before the current one.",
  hintRepresentation: "{{previousPinName}}",
  fullRepresentation: "Last Opened Pin Name",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PreviousPinNamePlaceholder;
