import { useEffect, useState } from "react";
import {
  Icon,
  List,
  Action,
  ActionPanel,
  getPreferenceValues,
  LocalStorage,
  showToast,
  environment,
} from "@raycast/api";
import { setStorage, getStorage, ExtensionPreferences } from "./lib/utils";
import { PinForm } from "./components/PinForm";
import { StorageKey } from "./lib/constants";
import {
  Pin,
  checkExpirations,
  deletePin,
  getLastOpenedPin,
  getPinKeywords,
  openPin,
  sortPins,
  usePins,
} from "./lib/Pins";
import { Group, useGroups } from "./lib/Groups";
import path from "path";
import {
  addApplicationAccessory,
  addCreationDateAccessory,
  addExecutionVisibilityAccessory,
  addExpirationDateAccessory,
  addFrequencyAccessory,
  addLastOpenedAccessory,
  addTextFragmentAccessory,
} from "./lib/accessories";
import { getPinIcon } from "./lib/icons";
import RecentApplicationsList from "./components/RecentApplicationsList";
import { installExamples } from "./lib/defaults";

/**
 * Move a pin up in the list. If the pin is in a group, it will be moved up within the group. Otherwise, it will be moved up in the overall list of pins.
 * @param index The current index of the pin.
 * @param setPins The function to set the list of pins.
 */
const movePinUp = async (index: number, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) => {
  const storedPins: Pin[] = await getStorage(StorageKey.LOCAL_PINS);
  const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
  const preferences = getPreferenceValues<ExtensionPreferences & CommandPreferences>();
  if (preferences.showGroups) {
    // Move pin up within its group
    const otherGroup = { name: "Other", icon: "Minus", id: -1 };
    const pinsSortedByGroup = storedGroups.concat(otherGroup).reduce((acc, current) => {
      const groupPins = storedPins.filter(
        (pin) => pin.group == current.name || (pin.group == "None" && current.name == "Other")
      );
      if (groupPins.length > index) {
        [groupPins[index - 1], groupPins[index]] = [groupPins[index], groupPins[index - 1]];
      }
      return [...acc, ...groupPins];
    }, [] as Pin[]);
    setPins(pinsSortedByGroup);
    await setStorage(StorageKey.LOCAL_PINS, pinsSortedByGroup);
  } else {
    // Move pin up in overall list
    if (storedPins.length > index) {
      [storedPins[index - 1], storedPins[index]] = [storedPins[index], storedPins[index - 1]];
      setPins(storedPins);
      await setStorage(StorageKey.LOCAL_PINS, storedPins);
    }
  }
};

/**
 * Moves a pin down in the list of pins. If the pin is in a group, it will be moved down within its group. Otherwise, it will be moved down in the overall list of pins.
 * @param index The current index of the pin.
 * @param setPins The function to set the list of pins.
 */
const movePinDown = async (index: number, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) => {
  const storedPins: Pin[] = await getStorage(StorageKey.LOCAL_PINS);
  const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
  const preferences = getPreferenceValues<ExtensionPreferences & CommandPreferences>();
  if (preferences.showGroups) {
    // Move pin down within its group
    const otherGroup = { name: "Other", icon: "Minus", id: -1 };
    const pinsSortedByGroup = storedGroups.concat(otherGroup).reduce((acc, current) => {
      const groupPins = storedPins.filter(
        (pin) => pin.group == current.name || (pin.group == "None" && current.name == "Other")
      );
      if (groupPins.length > index + 1) {
        [groupPins[index], groupPins[index + 1]] = [groupPins[index + 1], groupPins[index]];
      }
      return [...acc, ...groupPins];
    }, [] as Pin[]);
    setPins(pinsSortedByGroup);
    await setStorage(StorageKey.LOCAL_PINS, pinsSortedByGroup);
  } else {
    // Move pin down in overall list
    if (storedPins.length > index + 1) {
      [storedPins[index], storedPins[index + 1]] = [storedPins[index + 1], storedPins[index]];
      setPins(storedPins);
      await setStorage(StorageKey.LOCAL_PINS, storedPins);
    }
  }
};

/**
 * Action to create a new pin. Opens the PinForm view with a blank pin.
 * @param props.setPins The function to set the pins state.
 * @returns An action component.
 */
const CreateNewPinAction = (props: { setPins: React.Dispatch<React.SetStateAction<Pin[]>> }) => {
  const { setPins } = props;
  return (
    <Action.Push
      title="Create New Pin"
      icon={Icon.PlusCircle}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<PinForm setPins={setPins} />}
    />
  );
};

/**
 * Action to install example pins. Only shows if examples are not installed and no pins have been created.
 * @param props.setExamplesInstalled The function to set the examples installed state.
 * @param props.revalidatePins The function to revalidate the pins.
 * @param props.revalidateGroups The function to revalidate the groups.
 * @returns An action component.
 */
const InstallExamplesAction = (props: {
  setExamplesInstalled: React.Dispatch<React.SetStateAction<LocalStorage.Value | undefined>>;
  revalidatePins: () => Promise<void>;
  revalidateGroups: () => Promise<void>;
}) => {
  const { setExamplesInstalled, revalidatePins, revalidateGroups } = props;
  return (
    <Action
      title="Install Example Pins"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={async () => {
        await installExamples();
        setExamplesInstalled(true);
        await revalidatePins();
        await revalidateGroups();
        await showToast({ title: "Examples Installed!" });
      }}
    />
  );
};

/**
 * Action to open the Placeholders Guide in the default markdown viewer (might be TextEdit).
 * @returns An action component.
 */
const PlaceholdersGuideAction = () => {
  return (
    <Action.Open
      title="Open Placeholders Guide"
      icon={Icon.Info}
      target={path.resolve(environment.assetsPath, "placeholders_guide.md")}
      shortcut={{ modifiers: ["cmd"], key: "g" }}
    />
  );
};

/**
 * Preferences for the View Pins command.
 */
interface CommandPreferences {
  /**
   * Whether to display groups as separate sections.
   */
  showGroups: boolean;

  /**
   * Whether to display subtitles for pins.
   */
  showSubtitles: boolean;

  /**
   * Whether to display icons for applications that pins open with, if one is specified.
   */
  showApplication: boolean;

  /**
   * Whether to display a the initial creation date of each pin.
   */
  showCreationDate: boolean;

  /**
   * Whether to display the expiration date for pins that have one.
   */
  showExpiration: boolean;

  /**
   * Whether to display the execution visibility for Terminal command pins.
   */
  showExecutionVisibility: boolean;

  /**
   * Whether to display an icon accessory for text fragments.
   */
  showFragment: boolean;

  /**
   * Whether to display the number of times a pin has been opened.
   */
  showFrequency: boolean;

  /**
   * Whether to display an indicator for the most recently opened pin.
   */
  showLastOpened: boolean;
}

export default function Command() {
  const { pins, setPins, loadingPins, revalidatePins } = usePins();
  const { groups, loadingGroups, revalidateGroups } = useGroups();
  const [examplesInstalled, setExamplesInstalled] = useState<LocalStorage.Value | undefined>(true);
  const preferences = getPreferenceValues<ExtensionPreferences & CommandPreferences>();

  useEffect(() => {
    Promise.resolve(LocalStorage.getItem(StorageKey.EXAMPLES_INSTALLED)).then((examplesInstalled) => {
      setExamplesInstalled(examplesInstalled);
    });
    Promise.resolve(checkExpirations());
  }, []);

  const mostRecentPin = getLastOpenedPin(pins);
  const maxTimesOpened = Math.max(...pins.map((pin) => pin.timesOpened || 0));

  /**
   * Gets the list of pins as a list of ListItems.
   * @param pins The list of pins.
   * @returns A list of ListItems.
   */
  const getPinListItems = (pins: Pin[]) => {
    return sortPins(pins, groups).map((pin, index) => {
      // Add accessories based on the user's preferences
      const accessories: List.Item.Accessory[] = [];
      if (preferences.showFrequency) addFrequencyAccessory(pin, accessories, maxTimesOpened);
      if (preferences.showLastOpened) addLastOpenedAccessory(pin, accessories, mostRecentPin?.id);
      if (preferences.showCreationDate) addCreationDateAccessory(pin, accessories);
      if (preferences.showExpiration) addExpirationDateAccessory(pin, accessories);
      if (preferences.showApplication) addApplicationAccessory(pin, accessories);
      if (preferences.showExecutionVisibility) addExecutionVisibilityAccessory(pin, accessories);
      if (preferences.showFragment) addTextFragmentAccessory(pin, accessories);

      const group = groups.find((group) => group.name == pin.group);

      return (
        <List.Item
          title={pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}
          subtitle={
            preferences.showSubtitles ? pin.url.substring(0, 30) + (pin.url.length > 30 ? "..." : "") : undefined
          }
          keywords={getPinKeywords(pin)}
          key={pin.id}
          icon={getPinIcon(pin)}
          accessories={accessories}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Pin Actions">
                <Action title="Open" icon={Icon.ChevronRight} onAction={() => openPin(pin, preferences)} />

                <Action.CopyToClipboard
                  title="Copy Pin Name"
                  content={pin.name}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />

                <Action.CopyToClipboard
                  title="Copy Pin URL"
                  content={pin.url}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                />

                <Action.Push
                  title="Edit"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<PinForm pin={pin} setPins={setPins} />}
                />
                <Action.Push
                  title="Duplicate"
                  icon={Icon.EyeDropper}
                  shortcut={{ modifiers: ["cmd", "ctrl"], key: "d" }}
                  target={<PinForm pin={{ ...pin, name: pin.name + " Copy", id: -1 }} setPins={setPins} />}
                />

                {(index > 0 && !group?.sortStrategy) || group?.sortStrategy == "manual" ? (
                  <Action
                    title="Move Up"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                    onAction={async () => {
                      await movePinUp(index, setPins);
                    }}
                  />
                ) : null}
                {(index < pins.length - 1 && !group?.sortStrategy) || group?.sortStrategy == "manual" ? (
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    onAction={async () => {
                      await movePinDown(index, setPins);
                    }}
                  />
                ) : null}

                <Action
                  title="Delete Pin"
                  icon={Icon.Trash}
                  onAction={async () => {
                    await deletePin(pin, setPins);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  style={Action.Style.Destructive}
                />
              </ActionPanel.Section>
              <CreateNewPinAction setPins={setPins} />
              <PlaceholdersGuideAction />
            </ActionPanel>
          }
        />
      );
    });
  };

  return (
    <List
      isLoading={loadingPins || loadingGroups}
      searchBarPlaceholder="Search pins..."
      filtering={{ keepSectionOrder: true }}
      actions={
        <ActionPanel>
          <CreateNewPinAction setPins={setPins} />
          {!examplesInstalled && pins.length == 0 ? (
            <InstallExamplesAction
              setExamplesInstalled={setExamplesInstalled}
              revalidatePins={revalidatePins}
              revalidateGroups={revalidateGroups}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <List.EmptyView
        title="No Pins Yet!"
        description="Add a custom pin (⌘N)  or install some examples (⌘E)"
        icon="no-view.png"
      />
      {preferences.showGroups
        ? [{ name: "None", icon: "Minus", id: -1 }].concat(groups).map((group) => (
            <List.Section title={group.name == "None" ? "Other" : group.name} key={group.id}>
              {getPinListItems(pins.filter((pin) => pin.group == group.name))}
            </List.Section>
          ))
        : getPinListItems(pins)}

      <RecentApplicationsList
        pinActions={
            <>
            <CreateNewPinAction setPins={setPins} />
            {!examplesInstalled && pins.length == 0 ? (
              <InstallExamplesAction
                setExamplesInstalled={setExamplesInstalled}
                revalidatePins={revalidatePins}
                revalidateGroups={revalidateGroups}
              />
            ) : null}
          </>
        }
      />
    </List>
  );
}
