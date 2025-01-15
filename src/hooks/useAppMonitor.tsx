// import { useCachedState } from "@raycast/utils";
// import { StorageKey } from "../lib/common";
// import { useState } from "react";

// export const appMonitorDefaultState = {
//   currentApplication: { name: "", path: "", bundleId: "" },
//   recentApplications: [],
//   tabs: [],
//   currentTab: { name: "", url: "" },
//   currentDirectory: { name: "", path: "" },
//   selectedFiles: [],
//   selectedNotes: [],
//   currentDocument: { name: "", path: "" },
//   currentTrack: { name: "", artist: "", album: "", uri: "" },
// };

// export function useAppMonitor() {
//   const [appData, setAppData] = useCachedState(StorageKey.APP_DATA, appMonitorDefaultState);
//   const [loadingAppData, setLoadingAppData] = useState(true);

//   useEffect(() => {
//     const getLocalData = async () => {
//       const newData = dummyData();
//       newData.recentApplications = await getRecentApplications();

//       const app = newData.recentApplications[0];
//       newData.currentApplication = { name: app.name, path: app.path, bundleId: app.bundleId || "" };

//       const request = await requestLocalData();
//       newData.currentDirectory = request.currentDirectory || { name: "", path: "" };
//       newData.selectedFiles = request.finderSelection;
//       newData.selectedNotes = request.selectedNotes;
//       newData.currentDocument = request.activeDocument || { name: "", path: "" };
//       newData.currentTrack = request.currentTrack || { name: "", artist: "", album: "", uri: "" };

//       const browser = utils.SupportedBrowsers.find((b) => b.name == app.name);
//       if (browser) {
//         newData.tabs = await browser.tabs();
//         newData.currentTab = await browser.currentTab();
//       }
//       return newData;
//     };

//     getLocalData().then((newData) => {
//       setLocalData(newData);
//       setLoadingAppData(false);
//     });
//   }, []);

//   return { appData, loadingAppData };
// }
