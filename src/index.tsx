import { useEffect } from "react";
import { MenuBarExtra, openExtensionPreferences, getPreferenceValues, Icon } from "@raycast/api";
import { setStorage, getStorage, iconMap, copyPinData, ExtensionPreferences, getIcon } from "./lib/utils";
import { StorageKey } from "./lib/constants";
import { SupportedBrowsers } from "./lib/browser-utils";
import * as fs from "fs";
import { useLocalData } from "./lib/LocalData";
import { createNewGroup, useGroups } from "./lib/Groups";
import { Pin, createNewPin, deletePin, openPin, usePins } from "./lib/Pins";

export default function Command() {
  const { groups, loadingGroups } = useGroups();
  const { pins, setPins, loadingPins } = usePins();
  const { localData, loadingLocalData } = useLocalData();
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

    if (preferences.showRecentApplications) {
      let pseudoPinID = Math.max(...pins.map((pin) => pin.id));
      usedGroups["Recent Applications"] = localData.recentApplications.map((app) => {
        pseudoPinID++;
        return {
          id: pseudoPinID,
          name: app.name,
          url: app.path,
          icon: app.path,
          group: "Recent Applications",
          application: "None",
          date: undefined,
          execInBackground: false,
        };
      });
    }

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

    const selectedFiles = localData.selectedFiles.filter(
      (file) => file.path && (fs.statSync(file.path).isFile() || file.path.endsWith(".app/"))
    );

    // Display the menu
    return (
      <MenuBarExtra icon={pinIcon} isLoading={loadingPins || loadingGroups || loadingLocalData}>
        {[
          "None" in pinGroups ? (
            <MenuBarExtra.Section title={preferences.showCategories ? "Pins" : undefined} key="pins">
              {"None" in pinGroups
                ? pinGroups["None"].map((pin: Pin) => (
                    <MenuBarExtra.Item
                      key={pin.id}
                      icon={
                        pin.icon in iconMap || pin.icon == "None" || pin.icon.startsWith("/")
                          ? getIcon(pin.icon)
                          : getIcon(pin.url)
                      }
                      title={pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}
                      onAction={async (event) => {
                        if (event.type == "left-click") {
                          await openPin(pin, preferences);
                        } else {
                          await deletePin(pin, setPins);
                        }
                      }}
                    />
                  ))
                : null}
            </MenuBarExtra.Section>
          ) : null,
          groups?.length && Object.keys(usedGroups).length ? (
            <MenuBarExtra.Section title={preferences.showCategories ? "Groups" : undefined} key="groups">
              {Object.keys(usedGroups).map((key) => (
                <MenuBarExtra.Submenu
                  title={key}
                  key={key}
                  icon={
                    key == "Recent Applications"
                      ? Icon.Clock
                      : getIcon(groups.find((group) => group.name == key)?.icon || "")
                  }
                >
                  {usedGroups[key].map((pin) => (
                    <MenuBarExtra.Item
                      key={pin.id}
                      icon={
                        pin.icon in iconMap || pin.icon == "None" || pin.icon.startsWith("/")
                          ? getIcon(pin.icon)
                          : getIcon(pin.url)
                      }
                      title={pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}
                      onAction={async (event) => {
                        if (event.type == "left-click" || key == "Recent Applications") {
                          await openPin(pin, preferences);
                        } else {
                          await deletePin(pin, setPins);
                        }
                      }}
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
          ) : null,
        ].sort(() => (preferences.topSection == "pins" ? 1 : -1))}

        <MenuBarExtra.Section>
          {preferences.showPinShortcut &&
          localData.currentApplication.name.length > 0 &&
          (localData.currentApplication.name != "Finder" || localData.currentDirectory.name != "Desktop") ? (
            <MenuBarExtra.Item
              title={`Pin This App (${localData.currentApplication.name.substring(0, 20)})`}
              icon={{ fileIcon: localData.currentApplication.path }}
              tooltip="Add a pin whose target path is the path of the current app"
              onAction={async () => {
                await createNewPin(
                  localData.currentApplication.name,
                  localData.currentApplication.path,
                  "Favicon / File Icon",
                  "None",
                  "None",
                  undefined,
                  undefined
                );
              }}
            />
          ) : null}
          {preferences.showPinShortcut && SupportedBrowsers.includes(localData.currentApplication.name) ? (
            <MenuBarExtra.Item
              title={`Pin This Tab (${localData.currentTab.name.substring(0, 20).trim()}${
                localData.currentTab.name.length > 20 ? "..." : ""
              })`}
              icon={Icon.AppWindow}
              tooltip="Add a pin whose target URL is the URL of the current browser tab"
              onAction={async () => {
                await createNewPin(
                  localData.currentTab.name,
                  localData.currentTab.url,
                  "Favicon / File Icon",
                  "None",
                  "None",
                  undefined,
                  undefined
                );
              }}
            />
          ) : null}
          {preferences.showPinShortcut &&
          SupportedBrowsers.includes(localData.currentApplication.name) &&
          localData.tabs.length > 1 ? (
            <MenuBarExtra.Item
              title={`Pin All Tabs (${localData.tabs.length})`}
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
                for (const tab of localData.tabs) {
                  await createNewPin(
                    tab.name,
                    tab.url,
                    "Favicon / File Icon",
                    newGroupName,
                    "None",
                    undefined,
                    undefined
                  );
                }
              }}
            />
          ) : null}
          {preferences.showPinShortcut && localData.currentApplication.name == "Finder" && selectedFiles.length > 0 ? (
            <MenuBarExtra.Item
              title={`Pin ${
                selectedFiles.length > 1
                  ? `These Files (${selectedFiles.length})`
                  : `This File (${selectedFiles[0].name.substring(0, 20).trim()}${
                      selectedFiles[0].name.length > 20 ? "..." : ""
                    })`
              }`}
              icon={{ fileIcon: selectedFiles[0].path }}
              tooltip="Create a pin for each selected file, pinned to a new group"
              onAction={async () => {
                if (selectedFiles.length == 1) {
                  await createNewPin(
                    selectedFiles[0].name,
                    selectedFiles[0].path,
                    "Favicon / File Icon",
                    "None",
                    "None",
                    undefined,
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
                    await createNewPin(
                      file.name,
                      file.path,
                      "Favicon / File Icon",
                      newGroupName,
                      "None",
                      undefined,
                      undefined
                    );
                  }
                }
              }}
            />
          ) : null}
          {preferences.showPinShortcut &&
          localData.currentApplication.name == "Finder" &&
          localData.currentDirectory.name != "Desktop" ? (
            <MenuBarExtra.Item
              title={`Pin This Directory (${localData.currentDirectory.name.substring(0, 20).trim()}${
                localData.currentDirectory.name.length > 20 ? "..." : ""
              })`}
              icon={{ fileIcon: localData.currentDirectory.path }}
              tooltip="Create a pin whose target path is the current directory of Finder"
              onAction={async () => {
                await createNewPin(
                  localData.currentDirectory.name,
                  localData.currentDirectory.path,
                  "Favicon / File Icon",
                  "None",
                  "None",
                  undefined,
                  undefined
                );
              }}
            />
          ) : null}
          {preferences.showPinShortcut &&
          [
            "TextEdit",
            "Pages",
            "Numbers",
            "Keynote",
            "Microsoft Word",
            "Microsoft Excel",
            "Microsoft PowerPoint",
            "Script Editor",
          ].includes(localData.currentApplication.name) &&
          localData.currentDocument.path != "" ? (
            <MenuBarExtra.Item
              title={`Pin This Document (${localData.currentDocument.name.substring(0, 20).trim()}${
                localData.currentDocument.name.length > 20 ? "..." : ""
              })`}
              icon={{ fileIcon: localData.currentApplication.path }}
              tooltip="Create a pin whose target path is the current directory of Finder"
              onAction={async () => {
                await createNewPin(
                  localData.currentDocument.name,
                  localData.currentDocument.path,
                  localData.currentApplication.path,
                  "None",
                  "None",
                  undefined,
                  undefined
                );
              }}
            />
          ) : null}
          {preferences.showPinShortcut &&
          localData.currentApplication.name == "Notes" &&
          localData.selectedNotes.length > 0 ? (
            <MenuBarExtra.Item
              title={`Pin ${
                localData.selectedNotes.length > 1
                  ? `These Notes (${localData.selectedNotes.length})`
                  : `This Note (${localData.selectedNotes[0].name.substring(0, 20).trim()}${
                      localData.selectedNotes[0].name.length > 20 ? "..." : ""
                    })`
              }`}
              icon={{ fileIcon: localData.currentApplication.path }}
              tooltip="Create a pin for each selected note, pinned to a new group"
              onAction={async () => {
                if (localData.selectedNotes.length == 1) {
                  const cmd = `osascript -e 'Application("Notes").notes.byId("${localData.selectedNotes[0].id}").show()' -l "JavaScript"`;
                  await createNewPin(
                    localData.selectedNotes[0].name,
                    cmd,
                    localData.currentApplication.path,
                    "None",
                    "None",
                    undefined,
                    true
                  );
                } else {
                  let newGroupName = "New Note Group";
                  let iter = 2;
                  while (groups.map((group) => group.name).includes(newGroupName)) {
                    newGroupName = `New Note Group (${iter})`;
                    iter++;
                  }
                  await createNewGroup(newGroupName, localData.currentApplication.path);
                  for (const note of localData.selectedNotes) {
                    const cmd = `osascript -e 'Application("Notes").notes.byId("${note.id}").show()' -l "JavaScript"`;
                    await createNewPin(
                      note.name,
                      cmd,
                      localData.currentApplication.path,
                      newGroupName,
                      "None",
                      undefined,
                      true
                    );
                  }
                }
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
    <MenuBarExtra icon={pinIcon} isLoading={loadingPins || loadingGroups || loadingLocalData}>
      <MenuBarExtra.Item title="No pins yet!" />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Preferences..." icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}