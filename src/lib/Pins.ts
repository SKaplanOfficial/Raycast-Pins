import { useCachedState } from "@raycast/utils";
import { LaunchType, confirmAlert, environment, open, showHUD, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { StorageKey } from "./constants";
import { getStorage, runCommand, runCommandInTerminal, setStorage } from "./utils";
import * as fs from "fs";
import * as os from "os";

export type Pin = {
  name: string;
  url: string;
  icon: string;
  group: string;
  id: number;
  application: string;
  expireDate?: string;
  execInBackground?: boolean;
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
    if (environment.launchType != LaunchType.Background) {
      await showHUD(`Removed ${numExpired} expired pin${numExpired == 1 ? "" : "s"}`);
    } else {
      await showToast({ title: `Removed ${numExpired} expired pin${numExpired == 1 ? "" : "s"}` });
    }
  }
  await setStorage(StorageKey.LOCAL_PINS, newPins);
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
export const openPin = async (pin: Pin, preferences: { preferredBrowser: string }) => {
  try {
    const target = pin.url.startsWith("~") ? pin.url.replace("~", os.homedir()) : pin.url;
    const isPath = pin.url.startsWith("/") || pin.url.startsWith("~");
    const targetApplication = !pin.application || pin.application == "None" ? undefined : pin.application;
    if (isPath) {
      // Open the path in the target application (fallback to default application for the file type)
      if (fs.existsSync(target)) {
        open(target, targetApplication);
      } else {
        throw new Error("File does not exist.");
      }
    } else {
      if (target.match(/^[a-zA-Z0-9]*?:.*/g)) {
        // Open the URL in the target application (fallback to preferred browser, then default browser)
        open(target, targetApplication || preferences.preferredBrowser);
      } else {
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
 */
export const createNewPin = async (
  name: string,
  target: string,
  icon: string,
  group: string,
  application: string,
  expireDate: Date | undefined,
  execInBackground: boolean | undefined
) => {
  // Get the stored pins
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);

  // Get the next available pin ID
  let newID = (await getStorage(StorageKey.NEXT_PIN_ID))[0];
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
  });

  // Update the stored pins
  await setStorage(StorageKey.LOCAL_PINS, newData);
};

export const modifyPin = async (
  pin: Pin,
  name: string,
  url: string,
  icon: string,
  group: string,
  application: string,
  expireDate: Date | undefined,
  execInBackground: boolean | undefined,
  pop: () => void,
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>
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
      };
    } else {
      return oldPin;
    }
  });

  if (pin.id == -1) {
    pin.id = (await getStorage(StorageKey.NEXT_PIN_ID))[0];
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
    });
  }

  setPins(newData);
  await setStorage(StorageKey.LOCAL_PINS, newData);
  await showToast({ title: `Updated pin!` });
  pop();
};

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
