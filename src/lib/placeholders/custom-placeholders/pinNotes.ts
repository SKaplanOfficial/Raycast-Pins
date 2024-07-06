import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { Pin } from "../../Pins";

/**
 * Placeholder for the notes for the current pin.
 */
const PinNotesPlaceholder: Placeholder = {
  name: "pinNotes",
  regex: /{{pinNotes}}/,
  rules: [],
  apply: async (str, context?: { [key: string]: unknown } ) => {
    if (!context || !context["pin"]) {
      return { result: "" };
    }
    return { result: (context["pin"] as Pin).notes || "" };
  },
  constant: false,
  fn: async (context?) => (await PinNotesPlaceholder.apply(`{{pinNotes}}`, context as unknown as { [key: string]: unknown })).result,
  example: "{{pinNotes}}",
  description: "Gets the notes for the current pin.",
  hintRepresentation: "{{pinNotes}}",
  fullRepresentation: "Pin Notes",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PinNotesPlaceholder;
