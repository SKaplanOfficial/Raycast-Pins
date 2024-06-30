import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { Pin } from "../../Pins";

/**
 * Placeholder for the name of the current pin.
 */
const PinNamePlaceholder: Placeholder = {
  name: "pinName",
  regex: /{{pinName}}/,
  rules: [],
  apply: async (str, context?: { [key: string]: unknown } ) => {
    if (!context || !context["pin"]) {
      return { result: "" };
    }
    return { result: (context["pin"] as Pin).name };
  },
  constant: false,
  fn: async (context?: { [key: string]: unknown }) => (await PinNamePlaceholder.apply(`{{pinName}}`, context)).result,
  example: "{{pinName}}",
  description: "Gets the name of the current pin.",
  hintRepresentation: "{{pinName}}",
  fullRepresentation: "Pin Name",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PinNamePlaceholder;
