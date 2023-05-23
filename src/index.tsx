import { useEffect } from "react";
import {
  MenuBarExtra,
  openExtensionPreferences,
  getPreferenceValues,
  getFrontmostApplication,
  Icon,
} from "@raycast/api";
import { getFavicon, useCachedState } from "@raycast/utils";
import {
  setStorage,
  getStorage,
  iconMap,
  useGroups,
  copyPinData,
  openPin,
  createNewPin,
  getCurrentDirectory,
  getFinderSelection,
  createNewGroup,
  usePins,
} from "./utils";
import { StorageKey } from "./constants";
import { Pin, Group, ExtensionPreferences } from "./types";
import { SupportedBrowsers, getCurrentTabs, getCurrentURL } from "./browser-utils";
import * as fs from "fs";

// const usePinGroups = () => {
//   // Get the groups to display in the menu (i.e. groups that actually contain pins)
//   const [state, setState] = useCachedState<{ pinGroups: { [index: string]: Pin[] }; isLoading: boolean }>(
//     "menu-pin-groups",
//     {
//       pinGroups: {},
//       isLoading: true,
//     }
//   );

//   useEffect(() => {
//     Promise.resolve(getStorage(StorageKey.LOCAL_PINS)).then((pins) => {
//       const pinGroups: { [index: string]: Pin[] } = {};

//       pins.forEach((pin: Pin) => {
//         if (pin.group in pinGroups) {
//           pinGroups[pin.group].push(pin);
//         } else {
//           pinGroups[pin.group] = [pin];
//         }
//       });

//       setState({ pinGroups: pinGroups, isLoading: false });
//     });
//   }, []);

//   return state;
// };

const getGroupIcon = (groupName: string, groups: Group[]) => {
  // Get the icon for each group displayed in the menu
  const groupMatch = groups?.filter((group) => {
    return group.name == groupName;
  })[0];

  if (groupMatch && groupMatch.icon in iconMap) {
    return iconMap[groupMatch.icon];
  }

  return "";
};

export default function Command() {
  const [groups] = useGroups();
  const { pins, isLoading } = usePins();
  const [currentApp, setCurrentApp] = useCachedState<string[]>("current-app-name", ["", "", ""]);
  const [tabs, setTabs] = useCachedState<{ name: string; url: string }[]>("current-tabs", []);
  const [currentTab, setCurrentTab] = useCachedState<string[]>("current-tab-name", ["", ""]);
  const [currentDir, setCurrentDir] = useCachedState<string[]>("current-directory", ["", ""]);
  const [selection, setSelection] = useCachedState<{ name: string; path: string }[]>("finder-selection", []);
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const pinIcon = { source: { light: "pin-icon.svg", dark: "pin-icon@dark.svg" } };

  useEffect(() => {
    // Set initial values for the next pin/group IDs
    Promise.resolve(getStorage(StorageKey.NEXT_PIN_ID)).then((id) => {
      if (id.length == 0) {
        setStorage(StorageKey.NEXT_PIN_ID, [0]);
      }
    });

    Promise.resolve(getStorage(StorageKey.NEXT_GROUP_ID)).then((id) => {
      if (id.length == 0) {
        setStorage(StorageKey.NEXT_GROUP_ID, [0]);
      }
    });

    Promise.resolve(getFrontmostApplication())
      .then((app) => {
        setCurrentApp([app.name, app.path, app.bundleId || ""]);
        return app.name;
      })
      .then((appName) => {
        if (appName == "Finder") {
          Promise.resolve(getCurrentDirectory()).then((dir) => {
            setCurrentDir(dir);
          });
        } else if (SupportedBrowsers.includes(appName)) {
          Promise.resolve(getCurrentURL(appName)).then((tab) => {
            setCurrentTab(tab);
          });
          Promise.resolve(getCurrentTabs(appName)).then((tabs) => {
            setTabs(tabs);
          });
        }
      });

    Promise.resolve(getFinderSelection()).then((currentSelection) => {
      setSelection(currentSelection);
    });
  }, []);

  // If there are pins to display, then display them
  if (pins.length) {
    const usedGroups = groups
      ?.filter((group) => {
        return pins.some((pin) => pin.group == group.name);
      })
      .reduce(
        (obj: { [index: string]: Pin[] }, group) => {
          obj[group.name] = pins.filter((pin) => pin.group == group.name);
          return obj;
        },
        { None: pins.filter((pin) => pin.group == "None") }
      );

    const pinGroups = Object.values(usedGroups).reduce((obj: { [index: string]: Pin[] }, pins) => {
      pins.forEach((pin) => {
        if (pin.group in obj) {
          obj[pin.group].push(pin);
        } else {
          obj[pin.group] = [pin];
        }
      });
      return obj;
    }, {});

    // Remove the "None" group since it is redundant at this point
    if ("None" in usedGroups) {
      delete usedGroups["None"];
    }

    const selectedFiles = selection.filter(
      (file) => file.path && (fs.statSync(file.path).isFile() || file.path.endsWith(".app/"))
    );

    // Display the menu
    return (
      <MenuBarExtra icon={pinIcon} isLoading={isLoading}>
        {preferences.showCategories && "None" in pinGroups ? (
          <MenuBarExtra.Section title="Pins">
            {"None" in pinGroups
              ? pinGroups["None"].map((pin: Pin) => (
                  <MenuBarExtra.Item
                    key={pin.id}
                    icon={
                      pin.icon in iconMap
                        ? iconMap[pin.icon]
                        : pin.icon == "None"
                        ? ""
                        : pin.url.startsWith("/") || pin.url.startsWith("~")
                        ? { fileIcon: pin.url }
                        : pin.url.match(/.*?:.*/g)
                        ? getFavicon(pin.url)
                        : Icon.Terminal
                    }
                    title={pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}
                    onAction={async () => await openPin(pin, preferences)}
                  />
                ))
              : null}
          </MenuBarExtra.Section>
        ) : null}

        {preferences.showCategories && groups?.length && Object.keys(usedGroups).length ? (
          <MenuBarExtra.Section title="Groups">
            {Object.keys(usedGroups).map((key) => (
              <MenuBarExtra.Submenu title={key} key={key} icon={getGroupIcon(key, groups as Group[])}>
                {usedGroups[key].map((pin) => (
                  <MenuBarExtra.Item
                    key={pin.id}
                    icon={
                      pin.icon in iconMap
                        ? iconMap[pin.icon]
                        : pin.icon == "None"
                        ? ""
                        : pin.url.startsWith("/") || pin.url.startsWith("~")
                        ? { fileIcon: pin.url }
                        : pin.url.match(/.*?:.*/g)
                        ? getFavicon(pin.url)
                        : Icon.Terminal
                    }
                    title={pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}
                    onAction={async () => await openPin(pin, preferences)}
                  />
                ))}

                <MenuBarExtra.Section>
                  {preferences.showOpenAll ? (
                    <MenuBarExtra.Item
                      title="Open All"
                      onAction={() => usedGroups[key].forEach((pin: Pin) => openPin(pin, preferences))}
                    />
                  ) : null}
                </MenuBarExtra.Section>
              </MenuBarExtra.Submenu>
            ))}
          </MenuBarExtra.Section>
        ) : null}

        <MenuBarExtra.Section>
          {(preferences.showPinShortcut && currentApp[0].length > 0 && currentApp[0] != "Finder") ||
          currentDir[0] != "Desktop" ? (
            <MenuBarExtra.Item
              title={`Pin This App (${currentApp[0].substring(0, 20)})`}
              icon={{ fileIcon: currentApp[1] }}
              tooltip="Add a pin whose target path is the path of the current app"
              onAction={async () => {
                await createNewPin(currentApp[0], currentApp[1], "Favicon / File Icon", "None", "None", undefined);
              }}
            />
          ) : null}
          {preferences.showPinShortcut && SupportedBrowsers.includes(currentApp[0]) ? (
            <MenuBarExtra.Item
              title={`Pin This Tab (${currentTab[0].substring(0, 20).trim()}${currentTab[0].length > 20 ? "..." : ""})`}
              icon={Icon.AppWindow}
              tooltip="Add a pin whose target URL is the URL of the current browser tab"
              onAction={async () => {
                await createNewPin(currentTab[0], currentTab[1], "Favicon / File Icon", "None", "None", undefined);
              }}
            />
          ) : null}
          {preferences.showPinShortcut && SupportedBrowsers.includes(currentApp[0]) && tabs.length > 1 ? (
            <MenuBarExtra.Item
              title={`Pin All Tabs (${tabs.length})`}
              icon={Icon.AppWindowGrid3x3}
              tooltip="Create a new pin for each tab in the current browser window, pinned to a new group"
              onAction={async () => {
                let newGroupName = "New Tab Group";
                let iter = 2;
                while (groups.map((group) => group.name).includes(newGroupName)) {
                  newGroupName = `New Tab Group (${iter})`;
                  iter++;
                }
                await createNewGroup(
                  newGroupName,
                  Object.entries(Icon).find((entry) => entry[1] == Icon.AppWindowGrid3x3)?.[0] || "None"
                );
                for (const tab of tabs) {
                  await createNewPin(tab.name, tab.url, "Favicon / File Icon", newGroupName, "None", undefined);
                }
              }}
            />
          ) : null}
          {preferences.showPinShortcut && currentApp[0] == "Finder" && selectedFiles.length > 0 ? (
            <MenuBarExtra.Item
              title={`Pin ${
                selection.length > 1
                  ? `These Files (${selectedFiles.length})`
                  : `This File (${selectedFiles[0].name.substring(0, 20).trim()}${
                      selectedFiles[0].name.length > 20 ? "..." : ""
                    })`
              }`}
              icon={{ fileIcon: selectedFiles[0].path }}
              tooltip="Add a pin for each selected file, pinned to a new group"
              onAction={async () => {
                if (selectedFiles.length == 1) {
                  await createNewPin(
                    selectedFiles[0].name,
                    selectedFiles[0].path,
                    "Favicon / File Icon",
                    "None",
                    "None",
                    undefined
                  );
                } else {
                  let newGroupName = "New File Group";
                  let iter = 2;
                  while (groups.map((group) => group.name).includes(newGroupName)) {
                    newGroupName = `New File Group (${iter})`;
                    iter++;
                  }
                  await createNewGroup(
                    newGroupName,
                    Object.entries(Icon).find((entry) => entry[1] == Icon.Document)?.[0] || "None"
                  );
                  for (const file of selectedFiles) {
                    await createNewPin(file.name, file.path, "Favicon / File Icon", newGroupName, "None", undefined);
                  }
                }
              }}
            />
          ) : null}
          {preferences.showPinShortcut && currentApp[0] == "Finder" && currentDir[0] != "Desktop" ? (
            <MenuBarExtra.Item
              title={`Pin This Directory (${currentDir[0].substring(0, 20).trim()}${
                currentDir[0].length > 20 ? "..." : ""
              })`}
              icon={{ fileIcon: currentDir[1] }}
              tooltip="Add a pin whose target path is the current directory of Finder"
              onAction={async () => {
                await createNewPin(currentDir[0], currentDir[1], "Favicon / File Icon", "None", "None", undefined);
              }}
            />
          ) : null}
          <MenuBarExtra.Item
            title="Copy Pin Data"
            icon={Icon.CopyClipboard}
            tooltip="Copy the JSON data for all of your pins"
            onAction={() => copyPinData()}
          />
          <MenuBarExtra.Item title="Preferences..." icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra icon={pinIcon} isLoading={isLoading}>
      <MenuBarExtra.Item title="No pins yet!" />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Preferences..." icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
