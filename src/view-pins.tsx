import { useState } from "react";
import { Icon, List, ActionPanel, getPreferenceValues } from "@raycast/api";
import { pluralize } from "./lib/utils";
import { ExtensionPreferences } from "./lib/preferences";
import { PinForm } from "./components/PinForm";
import { ItemType, PinAction, Visibility } from "./lib/constants";
import { Pin, getLastOpenedPin, sortPins } from "./lib/Pins";
import { buildGroup, useGroups } from "./lib/Groups";
import RecentApplicationsList from "./components/RecentApplicationsList";
import { InstallExamplesAction } from "./components/actions/InstallExamplesAction";
import { ViewPinsPreferences } from "./lib/preferences";
import { useLocalData } from "./lib/LocalData";
import PinListItem from "./components/PinListItem";
import useExamples from "./hooks/useExamples";
import TagStoreProvider, { useTagStoreContext } from "./contexts/TagStoreContext";
import CreateNewItemAction from "./components/actions/CreateNewItemAction";
import PinStoreProvider, { usePinStoreContext } from "./contexts/PinStoreContext";

/**
 * Raycast command to view all pins in a list within the Raycast window.
 */
function PinsList(props: { args: { launchContext?: { pinID?: number; action?: PinAction } } }) {
  const { args } = props;
  const pinStore = usePinStoreContext();
  const { groups, loadingGroups, revalidateGroups } = useGroups();
  const preferences = getPreferenceValues<ExtensionPreferences & ViewPinsPreferences>();
  const { localData, loadingLocalData } = useLocalData();
  const [selectedPinID, setSelectedPinID] = useState<string | null>(null);
  const [filteredTag, setFilteredTag] = useState<string>("all");
  const [showingHidden, setShowingHidden] = useState<boolean>(false);
  const { examplesInstalled, setExamplesInstalled } = useExamples([ItemType.PIN]);
  const tagStore = useTagStoreContext();

  if (args.launchContext?.pinID) {
    const pin = pinStore.objects.find((pin) => pin.id == args.launchContext?.pinID);
    if (pin && args.launchContext.action !== PinAction.OPEN) {
      return <PinForm pin={pin} pinStore={pinStore} tagStore={tagStore} />;
    }
  }

  const maxTimesOpened = Math.max(...pinStore.objects.map((pin) => pin.timesOpened || 0));
  const lastOpenedPin = getLastOpenedPin(pinStore.objects);

  /**
   * Gets the list of pins as a list of ListItems.
   * @param pins The list of pins.
   * @returns A list of ListItems.
   */
  const getPinListItems = (pins: Pin[]) => {
    const visiblePins = pins.filter((pin) =>
      showingHidden
        ? true
        : pin.visibility === Visibility.USE_PARENT ||
          pin.visibility === Visibility.VISIBLE ||
          pin.visibility === Visibility.VIEW_PINS_ONLY ||
          pin.visibility === undefined,
    );
    return sortPins(visiblePins, groups).map((pin, index) => {
      return (
        <PinListItem
          key={pin.id}
          index={index}
          pin={pin}
          visiblePins={visiblePins}
          groups={groups}
          revalidateGroups={revalidateGroups}
          tagStore={tagStore}
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
  };

  const tagCounts = pinStore.objects.reduce(
    (acc, pin) => {
      pin.tags?.forEach((tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    },
    {} as { [key: string]: number },
  );
  const tagNames = Object.keys(tagCounts);

  const pinsWithNotes = pinStore.objects.filter((pin) => pin.notes?.length).map((pin) => pin.id.toString());

  return (
    <List
      isLoading={pinStore.loading || loadingGroups || loadingLocalData}
      searchBarPlaceholder="Search pins..."
      filtering={{ keepSectionOrder: true }}
      onSelectionChange={(pinID) => selectedPinID != pinID && setSelectedPinID(pinID)}
      isShowingDetail={pinsWithNotes.includes(selectedPinID || "")}
      searchBarAccessory={
        tagNames.length > 0 ? (
          <List.Dropdown tooltip="Filter by Tag" isLoading={pinStore.loading} onChange={setFilteredTag}>
            <List.Dropdown.Item title="All Tags" value="all" icon={Icon.Tag} />
            {tagNames.map((tag) => (
              <List.Dropdown.Item
                title={`${tag} (${tagCounts[tag]} ${pluralize("pin", tagCounts[tag])})`}
                value={tag}
                icon={Icon.Tag}
                key={tag}
              />
            ))}
          </List.Dropdown>
        ) : null
      }
      actions={
        <ActionPanel>
          <CreateNewItemAction itemType={ItemType.PIN} formView={<PinForm pinStore={pinStore} tagStore={tagStore} />} />
          {!examplesInstalled || pinStore.objects.length == 0 ? (
            <InstallExamplesAction
              setExamplesInstalled={setExamplesInstalled}
              revalidateGroups={revalidateGroups}
              kind="pins"
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
      {[buildGroup({ name: "None" })].concat(groups).map((group) =>
        preferences.showGroups ? (
          !showingHidden && (group.visibility === Visibility.HIDDEN || group.visibility === Visibility.MENUBAR_ONLY) ? (
            getPinListItems(
              pinStore.objects.filter(
                (pin) =>
                  (filteredTag === "all" || pin.tags?.some((tag) => tag === filteredTag)) &&
                  pin.group == group.name &&
                  pin.visibility !== Visibility.USE_PARENT &&
                  pin.visibility !== undefined,
              ),
            )
          ) : (
            <List.Section title={group.name == "None" ? "Other" : group.name} key={group.id}>
              {getPinListItems(
                pinStore.objects.filter(
                  (pin) =>
                    (filteredTag === "all" || pin.tags?.some((tag) => tag === filteredTag)) && pin.group == group.name,
                ),
              )}
            </List.Section>
          )
        ) : (
          getPinListItems(
            pinStore.objects.filter(
              (pin) =>
                (filteredTag === "all" || pin.tags?.some((tag) => tag === filteredTag)) && pin.group == group.name,
            ),
          )
        ),
      )}

      <RecentApplicationsList
        pinActions={
          <>
            <CreateNewItemAction
              itemType={ItemType.PIN}
              formView={<PinForm pinStore={pinStore} tagStore={tagStore} />}
            />
            {!examplesInstalled || pinStore.objects.length == 0 ? (
              <InstallExamplesAction
                setExamplesInstalled={setExamplesInstalled}
                revalidateGroups={revalidateGroups}
                kind="pins"
              />
            ) : null}
          </>
        }
      />
    </List>
  );
}

export default function ViewPinsCommand(args: { launchContext?: { pinID?: number; action?: PinAction } }) {
  // TODO: remove
  // useEffect(() => {
  //   const logMemUsage = () => {
  //     const used = process.memoryUsage().heapUsed / 1024 / 1024;
  //     console.log(`Memory usage: ${Math.round(used * 100) / 100} MB`);
  //   }

  //   const interval = setInterval(logMemUsage, 1000);
  //   return () => clearInterval(interval);
  // }, []);

  return (
    <PinStoreProvider>
      <TagStoreProvider>
        <PinsList args={args} />
      </TagStoreProvider>
    </PinStoreProvider>
  );
}
