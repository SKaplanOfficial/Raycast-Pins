import { DefaultPlaceholders, PlaceholderType } from "placeholders-toolkit";
import DelayDirective from "./custom-placeholders/delay";
import InputDirective from "./custom-placeholders/input";

const filteredPlaceholders = Object.values(DefaultPlaceholders).filter(() => true);

const PinsPlaceholders = [
  DelayDirective,
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.Informational),
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.StaticDirective),
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.InteractiveDirective),
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.Custom),
  InputDirective,
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.Script),
]

export default PinsPlaceholders;