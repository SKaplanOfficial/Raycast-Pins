import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

/**
 * Sets the value of a local storage key.
 */
export const setStorage = async (key: string, value: unknown) => {
  await LocalStorage.setItem(key, JSON.stringify(value));
};

/**
 * Gets the value of a local storage key.
 * @returns The JSON-parsed value of the key.
 */
export const getStorage = async (key: string) => {
  const storageString = await LocalStorage.getItem<string>(key);
  return storageString ? JSON.parse(storageString) : [];
};

export const storageMethods = {
  setItem: LocalStorage.setItem,
  getItem: LocalStorage.getItem,
  removeItem: LocalStorage.removeItem,
  useState: useCachedState,
};
