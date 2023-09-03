import { useCachedState } from "@raycast/utils";
import {
  Clipboard,
  Keyboard,
  LaunchType,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { StorageKey } from "./constants";
import { ExtensionPreferences, getStorage, runCommand, runCommandInTerminal, setStorage } from "./utils";
import * as fs from "fs";
import * as os from "os";
import { Placeholders } from "./placeholders";
import path from "path";
import { LocalDataObject } from "./LocalData";
import { Group } from "./Groups";

export type Pin = {
  /**
   * The name of the pin. This should generally be unique.
   */
  name: string;

  /**
   * The target URL or Terminal command to run when the pin is opened.
   */
  url: string;

  /**
   * A reference to the icon for the pin, either a valid Raycast icon, a URL, a file path, or an empty icon placeholder.
   */
  icon: string;

  /**
   * The name of the group that the pin belongs to, or "None" if the pin is not in a group.
   */
  group: string;

  /**
   * The unique ID of the pin.
   */
  id: number;

  /**
   * The application to open the pin in.
   */
  application: string;

  /**
   * The date that the pin expires and will be automatically removed. If undefined, the pin will never expire.
   */
  expireDate?: string;

  /**
   * Whether to treat the pin's target as a text fragment, regardless of its contents.
   */
  fragment?: boolean;

  /**
   * Whether or not the pin's target should be executed in the background. Only applies to pins with a Terminal command target.
   */
  execInBackground?: boolean;

  /**
   * The keyboard shortcut to open/execute the pin.
   */
  shortcut?: Keyboard.Shortcut;

  /**
   * The date that the pin was last opened.
   */
  lastOpened?: string;

  /**
   * The number of times that the pin has been opened.
   */
  timesOpened?: number;

  /**
   * The date that the pin was initially created.
   */
  dateCreated?: string;
};

/**
 * Removes expired pins.
 */
export const checkExpirations = async () => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);
  let numExpired = 0;
  const newPins = storedPins.filter((pin: Pin) => {
    if (pin.expireDate) {
      if (new Date(pin.expireDate) < new Date()) {
        numExpired++;
        return false;
      }
    }
    return true;
  });
  if (numExpired > 0) {
    if (environment.launchType == LaunchType.Background) {
      await showHUD(`Removed ${numExpired} expired pin${numExpired == 1 ? "" : "s"}`);
    } else {
      await showToast({ title: `Removed ${numExpired} expired pin${numExpired == 1 ? "" : "s"}` });
    }
  }
  await setStorage(StorageKey.LOCAL_PINS, newPins);
};

/**
 * Gets the stored pins.
 * @returns The list of pin objects.
 */
export const getPins = async () => {
  return await getStorage(StorageKey.LOCAL_PINS);
};

/**
 * Gets the stored pins.
 * @returns The list of pins alongside an update function.
 */
export const usePins = () => {
  const [pins, setPins] = useCachedState<Pin[]>("pins", []);
  const [loading, setLoading] = useState<boolean>(true);

  const revalidatePins = async () => {
    setLoading(true);
    const storedPins: Pin[] = await getStorage(StorageKey.LOCAL_PINS);
    setPins(storedPins);
    setLoading(false);
  };

  useEffect(() => {
    Promise.resolve(revalidatePins());
  }, []);

  return {
    pins: pins,
    setPins: setPins,
    loadingPins: loading,
    revalidatePins: revalidatePins,
  };
};

/**
 * Opens a pin.
 * @param pin The pin to open.
 * @param preferences The extension preferences object.
 */
export const openPin = async (pin: Pin, preferences: { preferredBrowser: string }, context?: LocalDataObject) => {
  await modifyPin(
    pin,
    pin.name,
    pin.url,
    pin.icon,
    pin.group,
    pin.application,
    pin.expireDate ? new Date(pin.expireDate) : undefined,
    pin.execInBackground,
    pin.fragment,
    pin.shortcut,
    new Date(),
    (pin.timesOpened || 0) + 1,
    pin.dateCreated ? new Date(pin.dateCreated) : undefined,
    () => {
      null;
    },
    () => {
      null;
    },
    false
  );
  try {
    if (pin.fragment) {
      // Copy the text fragment to the clipboard
      await Clipboard.copy(pin.url);

      if (environment.commandName == "index") {
        await showHUD("Copied To Clipboard");
      } else {
        await showToast({ title: "Copied To Clipboard" });
      }
      await setStorage(StorageKey.LAST_OPENED_PIN, pin.id);
      return;
    }

    const targetRaw = pin.url.startsWith("~") ? pin.url.replace("~", os.homedir()) : pin.url;
    const target = await Placeholders.applyToString(targetRaw, context);
    if (target == "") return;

    const isPath = pin.url.startsWith("/") || pin.url.startsWith("~");
    const targetApplication = !pin.application || pin.application == "None" ? undefined : pin.application;
    if (isPath) {
      // Open the path in the target application (fallback to default application for the file type)
      if (fs.existsSync(target)) {
        await open(path.resolve(target), targetApplication);
        await setStorage(StorageKey.LAST_OPENED_PIN, pin.id);
      } else {
        throw new Error("File does not exist.");
      }
    } else {
      if (target.match(/^[a-zA-Z](?![%])[a-zA-Z0-9+.-]+?:.*/g)) {
        // Open the URL in the target application (fallback to preferred browser, then default browser)
        await open(encodeURI(target), targetApplication || preferences.preferredBrowser);
        await setStorage(StorageKey.LAST_OPENED_PIN, pin.id);
      } else {
        // Open Terminal command in the default Terminal application
        await setStorage(StorageKey.LAST_OPENED_PIN, pin.id);
        if (pin.execInBackground) {
          // Run the Terminal command in the background
          await runCommand(target);
        } else {
          // Run the Terminal command in a new Terminal tab
          await runCommandInTerminal(target);
        }
      }
    }
  } catch (error) {
    if (environment.commandName == "view-pins") {
      await showToast({
        title: "Failed to open " + (pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)),
        message: (error as Error).message,
        style: Toast.Style.Failure,
      });
    } else {
      await showHUD(`Failed to open ${pin.name || pin.url}: ${(error as Error).message}`);
    }
  }
};

/**
 * Creates a new pin; updates local storage.
 * @param name The name of the pin.
 * @param target The URL, path, or Terminal command to pin.
 * @param icon The icon for the pin.
 * @param group The group the pin belongs to.
 * @param application The application to open the pin in.
 * @param expireDate The date the pin expires.
 * @param execInBackground Whether to run the specified command, if any, in the background.
 * @param fragment Whether to treat the pin's target as a text fragment, regardless of its contents.
 * @param shortcut The keyboard shortcut to open/execute the pin.
 */
export const createNewPin = async (
  name: string,
  target: string,
  icon: string,
  group: string,
  application: string,
  expireDate: Date | undefined,
  execInBackground: boolean | undefined,
  fragment: boolean | undefined,
  shortcut: Keyboard.Shortcut | undefined
) => {
  // Get the stored pins
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);

  // Get the next available pin ID
  let newID = (await getStorage(StorageKey.NEXT_PIN_ID))[0] || 1;
  while (storedPins.some((pin: Pin) => pin.id == newID)) {
    newID++;
  }
  await setStorage(StorageKey.NEXT_PIN_ID, [newID + 1]);

  // Add the new pin to the list of stored pins
  const newData = [...storedPins];
  newData.push({
    name: name,
    url: target,
    icon: icon,
    group: group,
    id: newID,
    application: application,
    expireDate: expireDate?.toUTCString(),
    execInBackground: execInBackground,
    fragment: fragment,
    shortcut: shortcut,
    dateCreated: new Date().toUTCString(),
  });

  // Update the stored pins
  await setStorage(StorageKey.LOCAL_PINS, newData);
};

/**
 * Updates a pin; updates local storage.
 * @param pin The pin to update.
 * @param name The new name of the pin.
 * @param url The new URL, path, or Terminal command to pin.
 * @param icon The new icon for the pin.
 * @param group The new group the pin belongs to.
 * @param application The new application to open the pin in.
 * @param expireDate The new date the pin expires.
 * @param execInBackground Whether to run the specified command, if any, in the background.
 * @param fragment Whether to treat the pin's target as a text fragment, regardless of its contents.
 * @param shortcut The new keyboard shortcut to open/execute the pin.
 * @param pop The function to close the pin editor.
 * @param setPins The function to update the list of pins.
 */
export const modifyPin = async (
  pin: Pin,
  name: string,
  url: string,
  icon: string,
  group: string,
  application: string,
  expireDate: Date | undefined,
  execInBackground: boolean | undefined,
  fragment: boolean | undefined,
  shortcut: Keyboard.Shortcut | undefined,
  lastOpened: Date | undefined,
  timesOpened: number | undefined,
  dateCreated: Date | undefined,
  pop: () => void,
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>,
  notify = true
) => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);
  const newData: Pin[] = storedPins.map((oldPin: Pin) => {
    // Update pin if it exists
    if (pin.id != -1 && oldPin.id == pin.id) {
      return {
        name: name,
        url: url,
        icon: icon,
        group: group,
        id: pin.id,
        application: application,
        expireDate: expireDate?.toUTCString(),
        execInBackground: execInBackground,
        fragment: fragment,
        shortcut: shortcut,
        lastOpened: lastOpened?.toUTCString(),
        timesOpened: timesOpened,
        dateCreated: dateCreated?.toUTCString(),
      };
    } else {
      return oldPin;
    }
  });

  if (pin.id == -1) {
    pin.id = (await getStorage(StorageKey.NEXT_PIN_ID))[0] || 1;
    while (storedPins.some((storedPin: Pin) => storedPin.id == pin.id)) {
      pin.id = pin.id + 1;
    }
    setStorage(StorageKey.NEXT_PIN_ID, [pin.id + 1]);

    // Add new pin if it doesn't exist
    newData.push({
      name: name,
      url: url,
      icon: icon,
      group: group,
      id: pin.id,
      application: application,
      expireDate: expireDate?.toUTCString(),
      execInBackground: execInBackground,
      fragment: fragment,
      shortcut: shortcut,
      lastOpened: lastOpened?.toUTCString(),
      timesOpened: timesOpened,
      dateCreated: dateCreated?.toUTCString(),
    });
  }

  setPins(newData);
  await setStorage(StorageKey.LOCAL_PINS, newData);

  if (notify) {
    await showToast({ title: `Updated pin!` });
  }
  pop();
};

/**
 * Deletes a pin; updates local storage.
 * @param pin The pin to delete.
 * @param setPins The function to update the list of pins.
 */
export const deletePin = async (pin: Pin, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) => {
  if (await confirmAlert({ title: "Are you sure?" })) {
    const storedPins = await getStorage(StorageKey.LOCAL_PINS);

    const filteredPins = storedPins.filter((oldPin: Pin) => {
      return oldPin.id != pin.id;
    });

    setPins(filteredPins);
    await setStorage(StorageKey.LOCAL_PINS, filteredPins);
    await showToast({ title: `Removed pin!` });
  }
};

/**
 * Gets the last opened pin.
 * @returns The {@link Pin} that was last opened.
 */
export const getPreviousPin = async (): Promise<Pin | undefined> => {
  const previousPin = await getStorage(StorageKey.LAST_OPENED_PIN);
  if (previousPin == undefined || parseInt(previousPin) == undefined) return undefined;
  const pins = await getStorage(StorageKey.LOCAL_PINS);
  return pins.find((pin: Pin) => pin.id == previousPin);
};

/**
 * Sorts pins according to extension-level and per-group sort strategy preferences.
 * @param pins The list of pins to sort.
 * @param groups The list of groups to sort by.
 * @returns The sorted list of pins.
 */
export const sortPins = (pins: Pin[], groups: Group[]) => {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  return pins.sort((p1, p2) => {
    const group = groups.find((group) => group.name == p1.group);
    if (group?.sortStrategy == "alphabetical" || (!group && preferences.defaultSortStrategy == "alphabetical")) {
      return p1.name.localeCompare(p2.name);
    } else if (group?.sortStrategy == "frequency" || (!group && preferences.defaultSortStrategy == "frequency")) {
      return (p2.timesOpened || 0) - (p1.timesOpened || 0);
    } else if (group?.sortStrategy == "recency" || (!group && preferences.defaultSortStrategy == "recency")) {
      return (p1.lastOpened ? new Date(p1.lastOpened) : new Date(0)).getTime() >
        (p2.lastOpened ? new Date(p2.lastOpened) : new Date(0)).getTime()
        ? -1
        : 1;
    } else if (group?.sortStrategy == "dateCreated" || (!group && preferences.defaultSortStrategy == "dateCreated")) {
      return (p1.dateCreated ? new Date(p1.dateCreated) : new Date(0)).getTime() >
        (p2.dateCreated ? new Date(p2.dateCreated) : new Date(0)).getTime()
        ? -1
        : 1;
    }
    return 0;
  });
};

/**
 * Gets the most recently opened pin.
 * @param pins The list of pins to search.
 * @returns The {@link Pin} that was most recently opened, or undefined if no pins have been created yet.
 */
export const getLastOpenedPin = (pins: Pin[]) => {
  const sortedPins = pins.sort((p1, p2) => {
    return (
      (p2.lastOpened ? new Date(p2.lastOpened) : new Date(0)).getTime() -
      (p1.lastOpened ? new Date(p1.lastOpened) : new Date(0)).getTime()
    );
  });
  if (sortedPins.length > 0) {
    return sortedPins[0];
  }
  return undefined;
};

/**
 * Gets keywords for a given pin. Keywords are derived from the pin's name, group name, and URL/target.
 * @param pin The pin to get keywords for.
 * @returns The list of keywords.
 */
export const getPinKeywords = (pin: Pin) => {
  return [
    ...(pin.group == "None" ? "Other" : pin.group.split(" ")),
    ...pin.url
      .replaceAll(/([ /:.'"-])(.+?)(?=\b|[ /:.'"-])/gs, " $1 $1$2 $2")
      .split(" ")
      .filter((term) => term.trim().length > 0),
  ];
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