import path from 'path';
import { bulkApply } from 'placeholders-toolkit/dist/lib/apply';
import { useEffect, useState } from 'react';

import {
    Action, ActionPanel, environment, getPreferenceValues, Icon, Keyboard, List, showToast
} from '@raycast/api';

import { useDataStorageContext } from '../contexts/DataStorageContext';
import { LocalObjectStore } from '../hooks/useLocalObjectStore';
import { getRecentApplications } from '../hooks/useRecentApps';
import { getPinAccessories } from '../lib/accessories';
import { Direction, ItemType, PinAction, SORT_STRATEGY, Visibility } from '../lib/common';
import { buildGroup, Group } from '../lib/group';
import { LocalDataObject } from '../lib/LocalData';
import { buildPin, getPinKeywords, getPins, getPinStatistics, openPin, Pin } from '../lib/pin';
import { PinsInfoPlaceholders } from '../lib/placeholders';
import { ExtensionPreferences, ViewPinsPreferences } from '../lib/preferences';
import { cutoff, getPinIcon } from '../lib/utils';
import CopyActionsSubmenu from './actions/CopyActionsSubmenu';
import CreateNewItemAction from './actions/CreateNewItemAction';
import DeleteItemAction from './actions/DeleteItemAction';
import { InstallExamplesAction } from './actions/InstallExamplesAction';
import { PinForm } from './PinForm';

/**
 * Moves a pin up or down in the list of pins. Pins stay within their groups unless grouping is disabled in preferences.
 * @param pin The pin to move.
 * @param direction The direction to move the pin in. One of {@link Direction}.
 * @param setPins The function to update the list of pins.
 */
const movePinInGroup = async (pin: Pin, direction: Direction, pinStore: LocalObjectStore<Pin>) => {
  const storedPins = [...pinStore.objects];
  const preferences = getPreferenceValues<ExtensionPreferences & ViewPinsPreferences>();

  const localPinGroup = storedPins.filter((p) => p.group == pin.group || !preferences.showGroups);
  const positionInGroup = localPinGroup.findIndex((p) => p.id == pin.id);
  const targetPosition = direction == Direction.UP ? positionInGroup - 1 : positionInGroup + 1;

  if (direction == Direction.UP ? targetPosition >= 0 : targetPosition < localPinGroup.length) {
    const targetPin = localPinGroup[targetPosition];
    const targetGlobalIndex = storedPins.findIndex((p) => p.id == targetPin.id);
    await pinStore.move(pin, targetGlobalIndex);
    await pinStore.load();
  }
};

const movePinToGroup = async (pin: Pin, group: Group, pinStore: LocalObjectStore<Pin>) => {
  const groupPins = pinStore.objects.filter((p) => p.group == group.name);
  const pinIndex = pinStore.objects.findIndex((p) => p.id == pin.id);
  if (groupPins.length == 0 || pinIndex == -1) return;

  const updatedPins = [...pinStore.objects];
  updatedPins.splice(pinIndex, 1);

  pin.group = group.name;
  const groupStart = pinStore.objects.findIndex((p) => p.id == groupPins[0].id);
  const targetIndex = groupStart + groupPins.length;
  await pinStore.move(pin, targetIndex);
  await pinStore.load();
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

export default function PinListItem(props: {
  index: number;
  pin: Pin;
  visiblePins: Pin[];
  maxTimesOpened: number;
  showingHidden: boolean;
  setShowingHidden: React.Dispatch<React.SetStateAction<boolean>>;
  lastOpenedPin: Pin | undefined;
  localData: LocalDataObject;
  preferences: ExtensionPreferences & ViewPinsPreferences;
  examplesInstalled: boolean;
  setExamplesInstalled: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    index,
    pin,
    visiblePins,
    maxTimesOpened,
    showingHidden,
    setShowingHidden,
    lastOpenedPin,
    localData,
    preferences,
    examplesInstalled,
    setExamplesInstalled,
  } = props;
  const { pinStore, groupStore, tagStore, loadingStores } = useDataStorageContext();
  const [title, setTitle] = useState<string>(pin.name || cutoff(pin.url, 20));

  useEffect(() => {
    (async () => {
      const newTitle = await bulkApply(pin.name, { allPlaceholders: PinsInfoPlaceholders });
      setTitle(newTitle);
    })();
  }, [pinStore.objects, pin.name]);

  // Add accessories based on the user's preferences
  let accessories: List.Item.Accessory[] = [];
  if (!loadingStores) {
    accessories = getPinAccessories(pin, preferences, showingHidden, maxTimesOpened, pinStore.objects, groupStore.objects, tagStore.toMap("name"), lastOpenedPin);
  }

  const group =
    groupStore.objects.find((group) => group.name == pin.group) ||
    buildGroup({
      name: "None",
      icon: "Minus",
    });

  return (
    <List.Item
      title={title}
      subtitle={preferences.showSubtitles ? cutoff(pin.url, 30) : undefined}
      keywords={getPinKeywords(pin)}
      key={pin.id}
      id={pin.id.toString()}
      icon={getPinIcon(pin)}
      accessories={accessories}
      detail={pin.notes?.length ? <List.Item.Detail markdown={pin.notes} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Pin Actions">
            <Action
              title="Open"
              icon={Icon.ChevronRight}
              shortcut={pin.shortcut}
              onAction={async () => {
                await getRecentApplications();
                await openPin(
                  pin,
                  preferences,
                  async (pin: Pin) => {
                    await pinStore.update([pin]);
                  },
                  localData as unknown as { [key: string]: unknown },
                );
                await pinStore.load();
                await groupStore.load();
              }}
            />

            <Action.Push
              title="Edit"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<PinForm pin={pin} />}
            />
            <Action.Push
              title="Duplicate"
              icon={Icon.EyeDropper}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
              target={<PinForm pin={buildPin({ ...pin, name: pin.name + " Copy" })} />}
            />

            <Action.CreateQuicklink
              title="Create Quicklink"
              shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
              quicklink={{
                name: pin.name,
                link: `raycast://extensions/HelloImSteven/pins/view-pins?context=${encodeURIComponent(
                  JSON.stringify({
                    pinID: pin.id,
                    action: PinAction.OPEN,
                  }),
                )}`,
              }}
            />

            <ActionPanel.Submenu
              title="Move Pin..."
              icon={Icon.ChevronUpDown}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            >
              {index > 0 &&
              (group.sortStrategy == SORT_STRATEGY.MANUAL ||
                (group?.name == undefined && preferences.defaultSortStrategy == "manual")) ? (
                <Action
                  title="Move Up"
                  icon={Icon.ArrowUp}
                  shortcut={Keyboard.Shortcut.Common.MoveUp}
                  onAction={async () => {
                    await movePinInGroup(pin, Direction.UP, pinStore);
                  }}
                />
              ) : null}
              {index < visiblePins.length - 1 &&
              visiblePins.length > 1 &&
              (group.sortStrategy == SORT_STRATEGY.MANUAL ||
                (group?.name == undefined && preferences.defaultSortStrategy == "manual")) ? (
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={Keyboard.Shortcut.Common.MoveDown}
                  onAction={async () => {
                    await movePinInGroup(pin, Direction.DOWN, pinStore);
                  }}
                />
              ) : null}
              <ActionPanel.Section title="Between Groups">
                {groupStore.objects
                  .filter((g) => g.name !== pin.group)
                  .map((group) => (
                    <Action
                      title={`Move to ${group.name}`}
                      key={group.id}
                      icon={Icon.ChevronRight}
                      onAction={async () => {
                        await movePinToGroup(pin, group, pinStore);
                      }}
                    />
                  ))}
                <Action
                  title="Move to Other"
                  key="Other"
                  icon={Icon.ChevronRight}
                  onAction={async () => {
                    const noneGroup = buildGroup({ name: "None" });
                    await movePinToGroup(pin, noneGroup, pinStore);
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel.Submenu>

            <DeleteItemAction item={pin} onDelete={async () => await pinStore.remove([pin])} />
            <Action
              title="Delete All Pins (Keep Groups)"
              icon={Icon.Trash}
              onAction={async () => {
                const storedPins = await getPins();
                for (let index = 0; index < storedPins.length; index++) {
                  // TODO: Add confirmation, move to own component
                  await pinStore.remove([storedPins[index]]);
                }
                await showToast({ title: "Deleted All Pins" });
              }}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
            />
          </ActionPanel.Section>
          <CreateNewItemAction itemType={ItemType.PIN} formView={<PinForm />} />
          {!examplesInstalled ? (
            <InstallExamplesAction kind={ItemType.PIN} onInstall={() => setExamplesInstalled(true)} />
          ) : null}

          <Action
            title={pin.visibility === Visibility.HIDDEN ? "Unhide Pin" : "Hide Pin"}
            icon={pin.visibility === Visibility.HIDDEN ? Icon.Eye : Icon.EyeDisabled}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
            onAction={async () => {
              if (pin.visibility === Visibility.HIDDEN) {
                await pinStore.update([{ ...pin, visibility: Visibility.VISIBLE }]);
              } else {
                await pinStore.update([{ ...pin, visibility: Visibility.HIDDEN }]);
              }
            }}
          />
          <Action
            title={pin.visibility === Visibility.DISABLED ? "Enable Pin" : "Disable Pin"}
            icon={pin.visibility === Visibility.DISABLED ? Icon.Checkmark : Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={async () => {
              if (pin.visibility === Visibility.DISABLED) {
                await pinStore.update([{ ...pin, visibility: Visibility.VISIBLE }]);
              } else {
                await pinStore.update([{ ...pin, visibility: Visibility.DISABLED }]);
              }
            }}
          />
          <Action
            title={showingHidden ? "Hide Hidden Pins" : "Show Hidden Pins"}
            icon={showingHidden ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            onAction={async () => {
              setShowingHidden(!showingHidden);
            }}
          />

          <PlaceholdersGuideAction />
          <CopyActionsSubmenu item={pin}>
            <Action.CopyToClipboard
              title="Copy Pin Target"
              content={pin.url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            />
            <Action.CopyToClipboard
              title="Copy Deeplink"
              content={`raycast://extensions/HelloImSteven/pins/view-pins?context=${encodeURIComponent(
                JSON.stringify({
                  pinID: pin.id,
                  action: PinAction.OPEN,
                }),
              )}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            />
            <Action.CopyToClipboard
              title="Copy Formatted Pin Statistics"
              content={getPinStatistics(pin, pinStore.objects) as string}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
            <Action.CopyToClipboard
              title="Copy Pin Statistics as JSON"
              content={JSON.stringify(getPinStatistics(pin, pinStore.objects, "object"))}
              shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "j" }}
            />
          </CopyActionsSubmenu>
        </ActionPanel>
      }
    />
  );
}
