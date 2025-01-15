import { getFrontmostApplication, Application, getPreferenceValues } from "@raycast/api";
// import EventEmitter from "events";
import { useState, useEffect } from "react";
import { StorageKey } from "../lib/common";
import { ExtensionPreferences } from "../lib/preferences";
import { getStorage, setStorage } from "../lib/storage";
import { useCachedState } from "@raycast/utils";

/**
 * Tracks recently used applications (if enabled in the extension's settings).
 */
export const updateRecentApplications = async () => {
  try {
    const app = await getFrontmostApplication();
    const recentApps = await getStorage(StorageKey.RECENT_APPS);
    const newRecentApps = recentApps.filter(
      (recentApp: Application) => recentApp.name != app.name && recentApp.name != "Raycast",
    );

    if (app.name != "Raycast") {
      newRecentApps.unshift(app);
    }
    while (newRecentApps.length > 10) {
      newRecentApps.pop();
    }
    await setStorage(StorageKey.RECENT_APPS, newRecentApps);
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
  const recentApps = await getStorage(StorageKey.RECENT_APPS);
  return recentApps;
};

// const TestEmitter = new EventEmitter();

/**
 * Hook to get the list of recently used applications.
 * @returns An object containing the list of recently used applications and a boolean indicating whether the list is still loading.
 */
export const useRecentApps = () => {
  const [recentApps, setRecentApps] = useCachedState<Application[]>(StorageKey.RECENT_APPS, []);
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

    // TestEmitter.on("updateRecentApplications", async () => {
    //   console.log("Updating recent applications...");
    // });

    // setInterval(() => {
    //   TestEmitter.emit("updateRecentApplications");
    // }, 5000);
  }, []);

  return { recentApplications: recentApps, loadingRecentApplications: loadingRecentApps };
};
