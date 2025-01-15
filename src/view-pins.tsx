import { useCallback, useMemo, useState } from "react";
import { Icon, List, ActionPanel, getPreferenceValues } from "@raycast/api";
import { pluralize } from "./lib/utils";
import { ExtensionPreferences } from "./lib/preferences";
import { PinForm } from "./components/PinForm";
import { ItemType, PinAction, Visibility } from "./lib/common";
import { Pin, getLastOpenedPin, sortPins } from "./lib/pin";
import { buildGroup, Group } from "./lib/group";
import RecentApplicationsList from "./components/RecentApplicationsList";
import { InstallExamplesAction } from "./components/actions/InstallExamplesAction";
import { ViewPinsPreferences } from "./lib/preferences";
import { useLocalData } from "./lib/LocalData";
import PinListItem from "./components/PinListItem";
import useExamples from "./hooks/useExamples";
import CreateNewItemAction from "./components/actions/CreateNewItemAction";
import DataStorageProvider, { useDataStorageContext } from "./contexts/DataStorageContext";

function PinList(props: { args: { launchContext?: { pinSpecifier?: string; action?: PinAction } } }) {
  const { args } = props;
  const { pinStore, groupStore, loadingStores, tagAssociations } = useDataStorageContext();
  const { localData, loadingLocalData } = useLocalData();
  const [selectedPinID, setSelectedPinID] = useState<string | null>(null);
  const [filteredTag, setFilteredTag] = useState<string>("all");
  const [showingHidden, setShowingHidden] = useState<boolean>(false);
  const { examplesInstalled, setExamplesInstalled } = useExamples([ItemType.PIN]);
  const preferences = getPreferenceValues<ExtensionPreferences & ViewPinsPreferences>();

  if (args.launchContext?.pinSpecifier) {
    const pin = pinStore.objects.find(
      (pin) => pin.id == args.launchContext?.pinSpecifier || pin.name == args.launchContext?.pinSpecifier,
    );
    if (pin && args.launchContext.action !== PinAction.OPEN) {
      return <PinForm pin={pin} />;
    }
  }

  const lastOpenedPin = useMemo(() => getLastOpenedPin(pinStore.objects), [pinStore.objects]);
  const [filteredPins, maxTimesOpened, pinsWithNotes] = useMemo(() => {
    const filtered = pinStore.objects.filter((pin) =>
      (filteredTag === "all" || pin.tags?.some((tag) => tag === filteredTag)) && showingHidden
        ? true
        : pin.visibility === Visibility.USE_PARENT ||
          pin.visibility === Visibility.VISIBLE ||
          pin.visibility === Visibility.VIEW_PINS_ONLY ||
          pin.visibility === undefined,
    );
    return [
      filtered,
      Math.max(...filtered.map((pin) => pin.timesOpened || 0)),
      filtered.filter((pin) => pin.notes?.length).map((pin) => pin.id),
    ];
  }, [pinStore.objects]);

  const getPinListItems = useCallback(
    (pins: Pin[]) => {
      return sortPins(pins, groupStore.objects).map((pin, index) => {
        return (
          <PinListItem
            key={pin.id}
            index={index}
            pin={pin}
            visiblePins={pins}
            maxTimesOpened={maxTimesOpened}
            lastOpenedPin={lastOpenedPin}
            showingHidden={showingHidden}
            setShowingHidden={setShowingHidden}
            localData={localData}
            preferences={preferences}
            examplesInstalled={examplesInstalled}
            setExamplesInstalled={setExamplesInstalled}
          />
        );
      });
    },
    [showingHidden, localData, examplesInstalled, groupStore.objects],
  );

  const getGroupedPins = useCallback(
    (group: Group) => getPinListItems(filteredPins.filter((pin) => pin.group == group.name)),
    [pinStore.objects, filteredTag],
  );

  const listItems = useMemo(
    () =>
      [buildGroup({ name: "None" })].concat(groupStore.objects).map((group) =>
        preferences.showGroups ? (
          !showingHidden && (group.visibility === Visibility.HIDDEN || group.visibility === Visibility.MENUBAR_ONLY) ? (
            getPinListItems(
              filteredPins.filter(
                (pin) =>
                  pin.group == group.name && pin.visibility !== Visibility.USE_PARENT && pin.visibility !== undefined,
              ),
            )
          ) : (
            <List.Section title={group.name == "None" ? "Other" : group.name} key={group.id}>
              {getGroupedPins(group)}
            </List.Section>
          )
        ) : (
          getGroupedPins(group)
        ),
      ),
    [groupStore.objects, pinStore.objects, filteredTag, showingHidden],
  );

  return (
    <List
      isLoading={loadingStores || loadingLocalData}
      searchBarPlaceholder="Search pins..."
      filtering={{ keepSectionOrder: true }}
      onSelectionChange={(pinID) => selectedPinID != pinID && setSelectedPinID(pinID)}
      isShowingDetail={pinsWithNotes.includes(selectedPinID || "")}
      searchBarAccessory={
        Object.keys(tagAssociations).length > 0 ? (
          <List.Dropdown tooltip="Filter by Tag" isLoading={loadingStores} onChange={setFilteredTag}>
            <List.Dropdown.Item title="All Tags" value="all" icon={Icon.Tag} />
            {Object.entries(tagAssociations).map(([name, { pins }]) => (
              <List.Dropdown.Item
                title={`${name} (${pins.length} ${pluralize("pin", pins.length)})`}
                value={name}
                icon={Icon.Tag}
                key={name}
              />
            ))}
          </List.Dropdown>
        ) : null
      }
      actions={
        <ActionPanel>
          <CreateNewItemAction itemType={ItemType.PIN} formView={<PinForm />} />
          {!examplesInstalled || pinStore.objects.length == 0 ? (
            <InstallExamplesAction setExamplesInstalled={setExamplesInstalled} kind={ItemType.PIN} />
          ) : null}
        </ActionPanel>
      }
    >
      <List.EmptyView
        title="No Pins Yet!"
        description="Create a pin (⌘N)  or install some examples (⌘E)"
        icon="no-view.png"
      />
      {listItems}
      {filteredTag === "all" && (
        <RecentApplicationsList
          pinActions={
            <>
              <CreateNewItemAction itemType={ItemType.PIN} formView={<PinForm />} />
              {!examplesInstalled || pinStore.objects.length == 0 ? (
                <InstallExamplesAction setExamplesInstalled={setExamplesInstalled} kind={ItemType.PIN} />
              ) : null}
            </>
          }
        />
      )}
    </List>
  );
}

export default function ViewPinsCommand(args: { launchContext?: { pinID?: number; action?: PinAction } }) {
  return (
    <DataStorageProvider>
      <PinList args={args} />
    </DataStorageProvider>
  );
}
