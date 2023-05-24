import { LocalStorage, Icon, Clipboard } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { exec, execSync } from "child_process";
import { StorageKey } from "./constants";
import { getFavicon } from "@raycast/utils";

export interface ExtensionPreferences {
  showCategories: boolean;
  showOpenAll: boolean;
  preferredBrowser: string;
  showPinShortcut: boolean;
  topSection: string;
  showRecentApplications: boolean;
}

/**
 * A map of icon names to icon objects.
 */
export const iconMap: { [index: string]: Icon } = Icon;

/**
 * Sets the value of a local storage key.
 * @param key The key to set the value of.
 * @param value The string value to set the key to.
 */
export const setStorage = async (key: string, value: unknown) => {
  await LocalStorage.setItem(key, JSON.stringify(value));
};

/**
 * Gets the value of a local storage key.
 * @param key The key to get the value of.
 * @returns The JSON-parsed value of the key.
 */
export const getStorage = async (key: string) => {
  const localStorage = await LocalStorage.getItem<string>(key);
  const storageString = typeof localStorage === "undefined" ? "" : localStorage;
  return storageString == "" ? [] : JSON.parse(storageString);
};

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
 * Runs a terminal command synchronously.
 * @param command The command to run.
 * @returns The result of the command as a string.
 */
export const runCommandSync = (command: string) => {
  const result = execSync(command);
  return result.toString();
};

/**
 * Runs Terminal command in a new Terminal tab.
 * @param command The command to run.
 * @returns A promise resolving to the output of the command as a string.
 */
export const runCommandInTerminal = async (command: string): Promise<string> => {
  const output = await runAppleScript(`tell application "Terminal"
    activate
    do script "${command.replaceAll('"', '\\"')}"
  end tell`);
  return output;
};

/**
 * Copies the pin data to the clipboard.
 * @returns A promise resolving to the JSON string of the pin data.
 */
export const copyPinData = async () => {
  const pins = await getStorage(StorageKey.LOCAL_PINS);
  const groups = await getStorage(StorageKey.LOCAL_GROUPS);

  const data = {
    groups: groups,
    pins: pins,
  };

  const jsonData = JSON.stringify(data);
  await Clipboard.copy(jsonData);
  return jsonData;
};

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
    return "";
  }
  return Icon.Terminal;
};
