import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { Pin } from "../../Pins";

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

    const data = {
      groups: [],
      pins: [context["pin"] as Pin],
    };

    return { result: JSON.stringify(data).replaceAll("{{", "[[[").replaceAll("}}", "]]]") };
  },
  constant: false,
  fn: async (context?) => (await PinJSONPlaceholder.apply(`{{pinJSON}}`, context as unknown as { [key: string]: unknown })).result,
  example: "{{pinJSON}}",
  description: "Gets the JSON representation of the current pin.",
  hintRepresentation: "{{pinJSON}}",
  fullRepresentation: "Pin JSON",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PinJSONPlaceholder;
