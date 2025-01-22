import { exec } from "child_process";
import { getFavicon, runAppleScript } from "@raycast/utils";
import { Icon, Image } from "@raycast/api";
import { Group } from "./group";
import { Pin } from "./pin";

/**
 * Runs a terminal command asynchronously.
 * @param command The command to run.
 * @param callback A callback function to run on each line of output.
 */
export const runCommand = async (command: string, callback?: (arg0: string) => unknown): Promise<string> => {
  const child = exec(command);
  let result = "";

  child.stdout?.on("data", (data: string) => {
    result = result + data;
    callback?.(result);
  });

  while (child.stdout?.readable) {
    await new Promise((r) => setTimeout(r, 100));
  }
  return result;
};

/**
 * Runs a Terminal command in a new Terminal tab.
 * @param command The command to run.
 */
export const runCommandInTerminal = async (command: string): Promise<string> => {
  const output = await runAppleScript(
    `tell application "Terminal"
    try
      activate
      do script "${command.replaceAll('"', '\\"')}"
    end try
  end tell`,
    { timeout: 0 },
  );
  return output;
};

/**
 * Cuts off a string at a certain length, adding an ellipsis if necessary.
 * @param str The string to modify.
 * @param cutoff The maximum length of the string.
 * @returns The modified string.
 */
export const cutoff = (str: string, cutoff: number) => {
  return `${str.substring(0, cutoff)}${str.length > cutoff ? "..." : ""}`;
};

/**
 * Pluralizes a string based on a count.
 * @param str The string to pluralize.
 * @param count The count to base the pluralization on.
 * @returns The pluralized string.
 */
export const pluralize = (str: string, count: number) => {
  return `${str}${count === 1 ? "" : "s"}`;
};

/**
 * Checks if a value is nullish (i.e. null, undefined, an empty string, an empty array, or an empty object).
 * @param value The value to check.
 * @returns True if the value is nullish, false otherwise.
 */
export const isNullish = (value: unknown): value is null | undefined => {
  if (typeof value == "string") {
    return value != "";
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value == "object") {
    return value !== null && Object.keys(value).length > 0;
  }
  return value !== null && value !== undefined;
};

/**
 * Converts a vague icon reference to an icon object.
 * @param iconRef The icon reference to convert.
 * @param color The color to tint the icon.
 */
export const getIcon = (iconRef: string, color?: string): Image.ImageLike => {
  const ref = iconRef as keyof typeof Icon;
  if (ref in Icon) {
    return { source: Icon[ref], tintColor: color };
  } else if (iconRef.startsWith("/") || iconRef.startsWith("~")) {
    return { fileIcon: ref };
  } else if (iconRef.match(/^[a-zA-Z0-9]*?:.*/g)) {
    return getFavicon(ref);
  } else if (iconRef == "None" || iconRef.replace(/{{(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/g, "").trim().length == 0) {
    return { source: Icon.Minus, tintColor: color };
  }
  return { source: Icon.Terminal, tintColor: color };
};

/**
 * Gets the de-referenced icon of a pin.
 */
export const getPinIcon = (pin: Pin) => {
  return pin.icon in Icon || pin.icon == "None" || pin.icon.startsWith("/")
    ? getIcon(pin.icon, pin.iconColor)
    : pin.fragment
      ? Icon.Text
      : getIcon(pin.url);
};

/**
 * Gets the de-referenced icon of a group.
 */
export const getGroupIcon = (group: Group): Image.ImageLike => {
  return group.name == "Recent Applications"
    ? Icon.Clock
    : group.icon in Icon
      ? getIcon(group.icon, group.iconColor)
      : Icon.Minus;
};
