import { Icon } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { Pin } from "./Pins";
import { Group } from "./Groups";

/**
 * A map of icon strings to their corresponding icon objects.
 */
export const iconMap = Icon as Record<string, Icon>;

/**
 * Converts a vague icon reference to an icon object.
 * @param iconRef The icon reference to convert.
 * @returns The icon object.
 */
export const getIcon = (iconRef: string) => {
  if (iconRef in iconMap) {
    return iconMap[iconRef];
  } else if (iconRef.startsWith("/") || iconRef.startsWith("~")) {
    return { fileIcon: iconRef };
  } else if (iconRef.match(/^[a-zA-Z0-9]*?:.*/g)) {
    return getFavicon(iconRef);
  } else if (iconRef == "None") {
    return Icon.Minus;
  }
  return Icon.Terminal;
};

/**
 * Gets the icon for a given pin, regardless of whether it's a URL, file path, or icon reference.
 * @param pin The pin to get the icon for.
 * @returns The icon object.
 */
export const getPinIcon = (pin: Pin) => {
  return pin.icon in iconMap || pin.icon == "None" || pin.icon.startsWith("/") ? getIcon(pin.icon) : getIcon(pin.url);
};

/**
 * Gets the icon for a given group.
 * @param group The group to get the icon for.
 * @returns The icon object.
 */
export const getGroupIcon = (group: Group) => {
  return group.name == "Recent Applications" ? Icon.Clock : group.icon in iconMap ? iconMap[group.icon] : Icon.Minus;
};
