import * as fs from "fs";
import * as os from "os";
import path from "path";
import { Fragment, useEffect } from "react";

import {
  Clipboard,
  environment,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import OpenAllMenuItem from "./components/menu-items/OpenAllMenuItem";
import PinMenuItem from "./components/menu-items/PinMenuItem";
import RecentApplicationsList from "./components/RecentApplicationsList";
import { KEYBOARD_SHORTCUT, Visibility } from "./lib/common";
import { getAncestorsOfGroup, getSubgroups, Group, shouldDisplayGroup } from "./lib/group";
import { getGroupIcon } from "./lib/utils";
import { useLocalData } from "./lib/LocalData";
import { copyPinData, openPin, Pin, sortPins } from "./lib/pin";
import { ExtensionPreferences, GroupDisplaySetting } from "./lib/preferences";
import { PinsMenubarPreferences } from "./lib/preferences";
import PinsPlaceholders from "./lib/placeholders";
import {
  NotesQuickPin,
  AppQuickPin,
  TextQuickPin,
  DirectoryQuickPin,
  DocumentQuickPin,
  TrackQuickPin,
  TabQuickPin,
  TabsQuickPin,
  FilesQuickPin,
} from "./components/menu-items/QuickPinMenuItems";
import TargetGroupMenu from "./components/TargetGroupMenu";
import DataStorageProvider, { useDataStorageContext } from "./contexts/DataStorageContext";

export function PinsMenubarExtra() {
  const { pinStore, groupStore, loadingStores } = useDataStorageContext();
  const { localData, loadingLocalData } = useLocalData();
  const [relevantPins, setRelevantPins] = useCachedState<Pin[]>("relevant-pins", []);
  const [irrelevantPins, setIrrelevantPins] = useCachedState<Pin[]>("irrelevant-pins", []);
  const preferences = getPreferenceValues<ExtensionPreferences & PinsMenubarPreferences>();

  const iconColor =
    preferences.iconColor == "System"
      ? undefined
      : { light: preferences.iconColor, dark: preferences.iconColor, adjustContrast: false };
  const pinIcon = { source: { light: "pin-icon.svg", dark: "pin-icon@dark.svg" }, tintColor: iconColor };

  useEffect(() => {
    if (!loadingStores && !loadingLocalData) {
      Promise.resolve(
        (async () => {
          if (!preferences.showInapplicablePins) {
            const [applicablePins, inapplicablePins] = [[], []] as [Pin[], Pin[]];
            for (const pin of pinStore.objects) {
              const targetRaw = pin.url.startsWith("~") ? pin.url.replace("~", os.homedir()) : pin.url;
              let containsPlaceholder = false;
              let passesTests = true;
              let ruleCount = 0;
              for (const placeholder of PinsPlaceholders) {
                if (targetRaw.match(placeholder.regex)) {
                  containsPlaceholder = true;
                  for (const rule of placeholder.rules || []) {
                    ruleCount++;
                    if (!(await rule(targetRaw, localData as unknown as { [key: string]: unknown }))) {
                      passesTests = false;
                    }
                  }
                }
              }
              if (containsPlaceholder && passesTests && ruleCount > 0) {
                applicablePins.push(pin);
              } else if (!passesTests) {
                inapplicablePins.push(pin);
              }
            }
            setRelevantPins(applicablePins);
            setIrrelevantPins(inapplicablePins);
          }
        })(),
      );
    }
  }, [loadingStores, loadingLocalData, localData]);

  const selectedFiles = localData.selectedFiles.filter(
    (file) =>
      file.path && ((fs.existsSync(file.path) && fs.statSync(file.path).isFile()) || file.path.endsWith(".app/")),
  );

  const allPins = sortPins(
    pinStore.objects
      .filter((p) => preferences.showInapplicablePins || !irrelevantPins.find((pin) => pin.id == p.id))
      .filter(
        (pin) =>
          pin.visibility === undefined ||
          pin.visibility === Visibility.USE_PARENT ||
          pin.visibility === Visibility.VISIBLE ||
          pin.visibility === Visibility.MENUBAR_ONLY,
      ),
    groupStore.objects,
  );

  /**
   * Recursively generates menu items for a group and its children.
   * @param group The group to generate subsections for.
   * @param groups The list of all groups.
   * @returns A submenu containing the group's subsections and pins.
   */
  const getSubsections = (group: Group, groups: Group[]): JSX.Element | null => {
    const parent = groups.find((g) => g.name == group.parent);
    const allSubgroups = getSubgroups(group, groups, true);
    const children = groups.filter((g) => g.parent == group.name);
    const memberPins = allPins.filter((pin) => pin.group == group.name);
    const subgroupPins = allPins.filter((pin) => children.some((g) => g.name == pin.group));
    if (memberPins.length + subgroupPins.length == 0) {
      return null;
    }

    const trueDepth = getAncestorsOfGroup(group, groups).length;
    const visualDepth = Math.max(
      getAncestorsOfGroup(group, groups).findIndex(
        (g) =>
          g.menubarDisplay === GroupDisplaySetting.SUBMENUS ||
          (groups.find((pr) => pr.name === g.parent)?.menubarDisplay === GroupDisplaySetting.SUBMENUS &&
            g.menubarDisplay === GroupDisplaySetting.USE_PARENT),
      ),
      0,
    );

    if (!shouldDisplayGroup(group, groups)) {
      return (
        <Fragment key={group.name}>
          {allPins
            .filter(
              (pin) =>
                pin.group == group.name && pin.visibility !== Visibility.USE_PARENT && pin.visibility !== undefined,
            )
            .map((pin) => (
              <PinMenuItem
                pin={pin}
                relevant={relevantPins.find((p) => p.id == pin.id) != undefined && !preferences.showInapplicablePins}
                preferences={preferences}
                localData={localData}
                key={pin.id}
              />
            ))}
          {children
            .filter((g) => g.visibility !== Visibility.USE_PARENT && g.visibility !== undefined)
            .map((g) => getSubsections(g, groups))}
        </Fragment>
      );
    }

    if (
      group.menubarDisplay === GroupDisplaySetting.ITEMS ||
      (group.menubarDisplay === GroupDisplaySetting.USE_PARENT &&
        parent?.menubarDisplay === GroupDisplaySetting.ITEMS) ||
      (group.menubarDisplay === GroupDisplaySetting.USE_PARENT &&
        visualDepth === 0 &&
        preferences.groupDisplaySetting === GroupDisplaySetting.ITEMS)
    ) {
      return (
        <Fragment key={group.name}>
          <MenuBarExtra.Item
            icon={getGroupIcon(group)}
            title={group.name}
            key={group.id}
            subtitle={memberPins.length > 0 ? "  ✧" : ""}
            onAction={async () => {
              for (const pin of memberPins) {
                await openPin(
                  pin,
                  preferences,
                  async (pin: Pin) => {
                    await pinStore.update([pin]);
                  },
                  localData as unknown as { [key: string]: string },
                );
              }
              for (const subgroup of allSubgroups) {
                const ancestors = getAncestorsOfGroup(subgroup, groups, { excluding: [group] });
                const openSubgroup =
                  ancestors.every((g) => g.menubarDisplay === GroupDisplaySetting.USE_PARENT) &&
                  subgroup.menubarDisplay === GroupDisplaySetting.USE_PARENT;
                if (openSubgroup) {
                  for (const pin of allPins.filter((p) => p.group == subgroup.name)) {
                    await openPin(
                      pin,
                      preferences,
                      async (pin: Pin) => {
                        await pinStore.update([pin]);
                      },
                      localData as unknown as { [key: string]: string },
                    );
                  }
                }
              }
            }}
          />
          {children.map((g) => {
            const ancestors = getAncestorsOfGroup(g, groups, { excluding: [group] });
            const displaySubgroup =
              ancestors.some((g) => g.menubarDisplay !== GroupDisplaySetting.USE_PARENT) ||
              g.menubarDisplay !== GroupDisplaySetting.USE_PARENT;
            if (displaySubgroup) {
              return getSubsections(g, groups);
            }
          })}
        </Fragment>
      );
    }
    if (
      group.menubarDisplay === GroupDisplaySetting.SUBSECTIONS ||
      (group.menubarDisplay === GroupDisplaySetting.USE_PARENT &&
        parent?.menubarDisplay === GroupDisplaySetting.SUBSECTIONS) ||
      (group.menubarDisplay === GroupDisplaySetting.USE_PARENT &&
        visualDepth === 0 &&
        preferences.groupDisplaySetting === GroupDisplaySetting.SUBSECTIONS)
    ) {
      return (
        <MenuBarExtra.Section title={`${"  ".repeat(visualDepth)}${group.name}`} key={group.id}>
          {memberPins.map((pin) => (
            <PinMenuItem
              pin={pin}
              relevant={relevantPins.find((p) => p.id == pin.id) != undefined && !preferences.showInapplicablePins}
              preferences={preferences}
              localData={localData}
              key={pin.id}
            />
          ))}
          {children.map((g) => getSubsections(g, groups))}
          {trueDepth > 0 && visualDepth > 0 ? (
            <OpenAllMenuItem
              key={`open_all_${group.name}`}
              pins={allPins.filter((p) => p.group == group.name)}
              submenuName={group.name}
            />
          ) : null}
        </MenuBarExtra.Section>
      );
    }

    return (
      <MenuBarExtra.Submenu
        title={
          group.name +
          (!preferences.showInapplicablePins &&
          allPins.filter((p) => p.group == group.name).some((pin) => relevantPins.find((p) => p.id == pin.id))
            ? "  ✧"
            : "")
        }
        key={group.id}
        icon={getGroupIcon(group)}
      >
        {[
          children.length > 0 ? children.map((g) => getSubsections(g, groups)) : null,
          allPins
            .filter((pin) => pin.group == group.name)
            .map((pin) => (
              <PinMenuItem
                pin={pin}
                relevant={relevantPins.find((p) => p.id == pin.id) != undefined && !preferences.showInapplicablePins}
                preferences={preferences}
                localData={localData}
                key={pin.id}
              />
            )),
        ].sort(() => (preferences.topSection == "pins" ? -1 : 1))}
        {memberPins.length > 0 ? (
          <OpenAllMenuItem
            key={`open_all_${group.name}`}
            pins={allPins.filter((p) => p.group == group.name)}
            submenuName={group.name}
          />
        ) : null}
      </MenuBarExtra.Submenu>
    );
  };

  const ungroupedPins = allPins.filter((p) => {
    if (preferences.groupDisplaySetting !== GroupDisplaySetting.NONE) {
      return p.group == "None";
    } else {
      if (p.visibility === Visibility.USE_PARENT || p.visibility === undefined) {
        return groupStore.objects.some(
          (g) => g.name == p.group && g.visibility !== Visibility.HIDDEN && g.visibility !== Visibility.VIEW_PINS_ONLY,
        );
      }
      return true;
    }
  });
  const groupSubmenus =
    preferences.groupDisplaySetting === GroupDisplaySetting.NONE
      ? []
      : groupStore.objects
          .filter((g) => g.parent == undefined)
          .map((group) => getSubsections(group, groupStore.objects))
          .filter((g) => g != null);

  return (
    <MenuBarExtra icon={pinIcon} isLoading={loadingStores || loadingLocalData}>
      {[
        [
          ungroupedPins.length > 0 ? (
            <MenuBarExtra.Section title={preferences.showCategories ? "Pins" : undefined} key="pins">
              {allPins.length == 0 ? <MenuBarExtra.Item title="No pins yet!" /> : null}
              {ungroupedPins.map((pin: Pin) => (
                <PinMenuItem
                  pin={pin}
                  relevant={relevantPins.find((p) => p.id == pin.id) != undefined && !preferences.showInapplicablePins}
                  preferences={preferences}
                  localData={localData}
                  key={pin.id}
                />
              ))}
            </MenuBarExtra.Section>
          ) : null,
          groupSubmenus?.length ? (
            <MenuBarExtra.Section title={preferences.showCategories ? "Groups" : undefined} key="groups">
              {groupSubmenus}
              <RecentApplicationsList />
            </MenuBarExtra.Section>
          ) : null,
        ].sort(() => (preferences.topSection == "pins" ? 1 : -1)),
        preferences.showPinShortcut &&
        !(
          localData.currentApplication.name == "Finder" &&
          localData.currentDirectory.name == "Desktop" &&
          localData.selectedFiles.length == 0
        ) ? (
          <MenuBarExtra.Section title="Quick Pins" key="quickPins">
            <AppQuickPin app={localData.currentApplication} />
            <TextQuickPin />
            <TabQuickPin app={localData.currentApplication} tab={localData.currentTab} />
            <TabsQuickPin app={localData.currentApplication} tabs={localData.tabs} groups={groupStore.objects} />
            <FilesQuickPin
              app={localData.currentApplication}
              selectedFiles={selectedFiles}
              groups={groupStore.objects}
            />
            <DirectoryQuickPin app={localData.currentApplication} directory={localData.currentDirectory} />
            <DocumentQuickPin app={localData.currentApplication} document={localData.currentDocument} />
            <TrackQuickPin app={localData.currentApplication} track={localData.currentTrack} />
            <NotesQuickPin
              app={localData.currentApplication}
              notes={localData.selectedNotes}
              groups={groupStore.objects}
            />
            <TargetGroupMenu groups={groupStore.objects} />
          </MenuBarExtra.Section>
        ) : null,
      ].sort(() => (preferences.topSection == "quickPins" ? -1 : 1))}

      <MenuBarExtra.Section>
        {preferences.showCreateNewPin ? (
          <MenuBarExtra.Item
            title="Create New Pin..."
            icon={Icon.PlusSquare}
            tooltip="Create a new pin"
            shortcut={KEYBOARD_SHORTCUT.CREATE_NEW_PIN}
            onAction={() => launchCommand({ name: "new-pin", type: LaunchType.UserInitiated })}
          />
        ) : null}
        {pinStore.objects.length > 0 && preferences.showCopyPinData ? (
          <MenuBarExtra.Item
            title="Copy Pin Data"
            icon={Icon.CopyClipboard}
            tooltip="Copy the JSON data for all of your pins"
            shortcut={KEYBOARD_SHORTCUT.COPY_PINS_JSON}
            onAction={async () => {
              const data = await copyPinData();
              const text = await Clipboard.readText();
              if (text == data) {
                await showHUD("Copied pin data to clipboard!");
              } else {
                await showHUD("Failed to copy pins to clipboard.");
              }
            }}
          />
        ) : null}
        {preferences.showOpenPlaceholdersGuide ? (
          <MenuBarExtra.Item
            title="Open Placeholders Guide"
            icon={Icon.QuestionMark}
            tooltip="Open the guide to using placeholders in Pins"
            shortcut={KEYBOARD_SHORTCUT.OPEN_PLACEHOLDERS_GUIDE}
            onAction={async () => await open(path.resolve(environment.assetsPath, "placeholders_guide.md"))}
          />
        ) : null}
        {preferences.showPreferences ? (
          <MenuBarExtra.Item
            title="Preferences..."
            icon={Icon.Gear}
            shortcut={KEYBOARD_SHORTCUT.OPEN_PREFERENCES}
            onAction={async () => await openCommandPreferences()}
          />
        ) : null}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default function ShowPinsCommand() {
  return (
    <DataStorageProvider>
      <PinsMenubarExtra />
    </DataStorageProvider>
  );
}
