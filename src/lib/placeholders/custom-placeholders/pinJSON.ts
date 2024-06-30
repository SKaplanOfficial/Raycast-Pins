import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { Pin } from "../../Pins";
import { Group } from "../../Groups";
import { getStorage } from "../../storage";
import { StorageKey } from "../../constants";

/**
 * Placeholder for the name of the current pin.
 */
const PinJSONPlaceholder: Placeholder = {
  name: "pinJSON",
  regex: /{{pinJSON}}/,
  rules: [],
  apply: async (str, context?: { [key: string]: unknown }) => {
    if (!context || !context["pin"]) {
      return { result: "" };
    }

    const groups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
    const data = {
      groups: groups,
      pins: [context["pin"] as Pin],
    };

    return { result: JSON.stringify(data).replaceAll("{{", "[[[").replaceAll("}}", "]]]") };
  },
  constant: false,
  fn: async (context?: { [key: string]: unknown }) => (await PinJSONPlaceholder.apply(`{{pinJSON}}`, context)).result,
  example: "{{pinJSON}}",
  description: "Gets the JSON representation of the current pin.",
  hintRepresentation: "{{pinJSON}}",
  fullRepresentation: "Pin JSON",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PinJSONPlaceholder;
