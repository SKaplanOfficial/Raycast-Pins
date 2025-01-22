import { getFrontmostApplication, Application, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { ExtensionPreferences } from "../lib/preferences";
import { getStorage, setStorage } from "../lib/storage";
import { useCachedState } from "@raycast/utils";
import { storageKeys } from "../lib/common";

/**
 * Tracks recently used applications (if enabled in the extension's settings).
 */
export const updateRecentApplications = async () => {
  try {
    const app = await getFrontmostApplication();
    const recentApps = await getStorage(storageKeys.recentApps);
    const newRecentApps = recentApps.filter(
      (recentApp: Application) => recentApp.name != app.name && recentApp.name != "Raycast",
    );

    if (app.name != "Raycast") {
      newRecentApps.unshift(app);
    }
    while (newRecentApps.length > 10) {
      newRecentApps.pop();
    }
    await setStorage(storageKeys.recentApps, newRecentApps);
  } catch (error) {
    console.error(error);
  }
};

/**
 * Gets the list of recently used applications.
 * @returns A promise resolving to an array of recently used applications as Application objects.
 */
export const getRecentApplications = async (): Promise<Application[]> => {
  await updateRecentApplications();
  const recentApps = await getStorage(storageKeys.recentApps);
  return recentApps;
};

/**
 * Hook to get the list of recently used applications.
 * @returns An object containing the list of recently used applications and a boolean indicating whether the list is still loading.
 */
export const useRecentApps = () => {
  const [recentApps, setRecentApps] = useCachedState<Application[]>(storageKeys.recentApps, []);
  const [loadingRecentApps, setLoadingRecentApps] = useState(true);

  useEffect(() => {
    const preferences = getPreferenceValues<ExtensionPreferences>();
    if (preferences.showRecentApplications) {
      getRecentApplications().then((newRecentApplications) => {
        setRecentApps(newRecentApplications);
        setLoadingRecentApps(false);
      });
    } else {
      setLoadingRecentApps(false);
    }
  }, []);

  return { recentApplications: recentApps, loadingRecentApplications: loadingRecentApps };
};
