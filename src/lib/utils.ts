import { exec } from "child_process";
import { getFavicon, runAppleScript } from "@raycast/utils";
import { Icon } from "@raycast/api";
import { Group } from "./group";
import { Pin } from "./pin";
import { useEffect, useRef, useState } from "react";

/**
 * Runs a terminal command asynchronously.
 * @param command The command to run.
 * @param callback A callback function to run on each line of output.
 */
export const runCommand = async (command: string, callback?: (arg0: string) => unknown) => {
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
 * Runs Terminal command in a new Terminal tab.
 * @param command The command to run.
 * @returns A promise resolving to the output of the command as a string.
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
 * Checks if a value is nullish.
 *
 * A nullish value is a value that is either null, undefined, an empty string, an empty array, or an empty object.
 *
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
 * Returns a new object with all nullish values removed.
 * @param obj The object to remove nullish values from.
 * @returns A new object with all nullish values removed.
 */
export const objectFromNonNullableEntriesOfObject = <T extends Record<string, unknown>>(obj: T): T => {
  const entries = Object.entries(obj);
  return Object.fromEntries(entries.filter(([, value]) => isNullish(value))) as T;
}; /**
 * A map of icon strings to their corresponding icon objects.
 */

export const iconMap = Icon as Record<string, Icon>;

/**
 * Converts a vague icon reference to an icon object.
 * @param iconRef The icon reference to convert.
 * @param color The color to tint the icon.
 * @returns The icon object.
 */
export const getIcon = (iconRef: string, color?: string) => {
  if (iconRef in iconMap) {
    return { source: iconMap[iconRef], tintColor: color };
  } else if (iconRef.startsWith("/") || iconRef.startsWith("~")) {
    return { fileIcon: iconRef };
  } else if (iconRef.match(/^[a-zA-Z0-9]*?:.*/g)) {
    return getFavicon(iconRef);
  } else if (iconRef == "None" || iconRef.replace(/{{(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/g, "").trim().length == 0) {
    return { source: Icon.Minus, tintColor: color };
  }
  return { source: Icon.Terminal, tintColor: color };
};

/**
 * Gets the icon for a given pin, regardless of whether it's a URL, file path, or icon reference.
 * @param pin The pin to get the icon for.
 * @returns The icon object.
 */
export const getPinIcon = (pin: Pin) => {
  return pin.icon in iconMap || pin.icon == "None" || pin.icon.startsWith("/")
    ? getIcon(pin.icon, pin.iconColor)
    : pin.fragment
      ? Icon.Text
      : getIcon(pin.url);
};

/**
 * Gets the icon for a given group.
 * @param group The group to get the icon for.
 * @returns The icon object.
 */
export const getGroupIcon = (group: Group) => {
  return group.name == "Recent Applications"
    ? Icon.Clock
    : group.icon in iconMap
      ? { source: iconMap[group.icon], tintColor: group.iconColor }
      : Icon.Minus;
};

export default function useRenderCount(callback: (count: number) => void) {
  const count = useRef<number>(0);
  const [, setStep] = useState<number>(0);

  useEffect(() => {
    count.current++;
    if ((count.current + 1) % 2 == 0) {
      const trueCount = (count.current + 1) / 2;
      callback(trueCount);
      setStep(count.current);
    }
  });

  return count.current;
}
