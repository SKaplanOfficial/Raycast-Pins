import {
  Icon,
  List,
  Action,
  ActionPanel,
  confirmAlert,
  Alert,
  getPreferenceValues,
  Keyboard,
  showToast,
} from "@raycast/api";
import { Direction, ItemType } from "./lib/common";
import { Group, buildGroup, deleteGroup } from "./lib/Groups";
import { Pin, openPin } from "./lib/pin";
import {
  addIDAccessory,
  addParentGroupAccessory,
  addSortingStrategyAccessory,
  addVisibilityAccessory,
} from "./lib/accessories";
import { getGroupIcon } from "./lib/icons";
import GroupForm from "./components/GroupForm";
import { InstallExamplesAction } from "./components/actions/InstallExamplesAction";
import CopyGroupActionsSubmenu from "./components/actions/CopyGroupActionsSubmenu";
import { ExtensionPreferences, ViewGroupsPreferences } from "./lib/preferences";
import { pluralize } from "./lib/utils";
import useExamples from "./hooks/useExamples";
import CreateNewItemAction from "./components/actions/CreateNewItemAction";
import DeleteItemAction from "./components/actions/DeleteItemAction";
import DataStorageProvider, { useDataStorageContext } from "./contexts/DataStorageContext";
import { LocalObjectStore } from "./hooks/useLocalObjectStore";

/**
 * Moves a group up or down in the list of groups.
 * @param group The group to move.
 * @param direction The direction to move the group in. One of {@link Direction}.
 * @param groupStore The store containing the groups.
 */
const moveGroup = async (group: Group, direction: Direction, groupStore: LocalObjectStore<Group>) => {
  const storedGroups = [...groupStore.objects];
  const groupIndex = storedGroups.findIndex((g) => g.id == group.id);
  const targetIndex = groupIndex + (direction == Direction.UP ? -1 : 1);
  if (storedGroups.length > targetIndex && targetIndex >= 0) {
    await groupStore.move(group, targetIndex);
    await groupStore.load();
  }
};

/**
 * Raycast command to view all pin groups in a list within the Raycast window.
 */
export function GroupList() {
  const { pinStore, groupStore } = useDataStorageContext();
  const { examplesInstalled, setExamplesInstalled } = useExamples([ItemType.GROUP]);
  const preferences = getPreferenceValues<ExtensionPreferences & ViewGroupsPreferences>();

  return (
    <List
      isLoading={groupStore.loading}
      searchBarPlaceholder="Search groups..."
      actions={
        <ActionPanel>
          <CreateNewItemAction itemType={ItemType.GROUP} formView={<GroupForm />} />
          {!examplesInstalled || groupStore.objects.length == 0 ? (
            <InstallExamplesAction setExamplesInstalled={setExamplesInstalled} kind="groups" />
          ) : null}
        </ActionPanel>
      }
    >
      <List.EmptyView title="No Groups Found" icon="no-view.png" />
      {groupStore.objects.map((group, index) => {
        const groupPins = pinStore.objects.filter((pin: Pin) => pin.group == group.name);
        const accessories: List.Item.Accessory[] = [];
        if (preferences.showVisibility) addVisibilityAccessory(group, accessories, true);
        if (preferences.showSortStrategy) addSortingStrategyAccessory(group, accessories);
        if (preferences.showIDs) addIDAccessory(group, accessories, groupStore.objects);
        if (preferences.showParentGroup) addParentGroupAccessory(group, accessories, groupStore.objects);

        return (
          <List.Item
            title={group.name}
            subtitle={`${groupPins.length} ${pluralize("Pin", groupPins.length)}`}
            accessories={accessories}
            key={group.id}
            icon={getGroupIcon(group)}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Group Actions">
                  <Action
                    title={`Open ${groupPins.length} ${pluralize("Pin", groupPins.length)}`}
                    icon={Icon.ChevronRight}
                    onAction={async () => {
                      await Promise.all(
                        groupPins.map(async (pin) => {
                          await openPin(
                            pin,
                            preferences,
                            async (pin: Pin) => {
                              await pinStore.update([pin]);
                            },
                          );
                        }),
                      );
                    }}
                  />
                  <Action.Push
                    title="Edit"
                    icon={Icon.Pencil}
                    target={<GroupForm group={group} />}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                  />
                  <DeleteItemAction
                    item={group}
                    onDelete={async () => await deleteGroup(group, groupStore, pinStore)}
                    options={{ customTitle: "Delete Group (Keep Pins)" }}
                  />
                  <Action
                    title="Delete Group And Pins"
                    icon={Icon.Trash}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Group And Pins",
                          message: "Are you sure?",
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        const updatedPins = pinStore.objects.filter((pin: Pin) => {
                          return pin.group != group.name;
                        });
                        await pinStore.update(updatedPins);
                        await deleteGroup(group, groupStore, pinStore);
                      }
                    }}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                  />
                  <Action
                    title="Delete All Groups (Keep Pins)"
                    icon={Icon.Trash}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Group And Pins",
                          message: "Are you sure?",
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        for (const group of groupStore.objects) {
                          await deleteGroup(group, groupStore, pinStore, false);
                        }
                        await showToast({ title: "Deleted All Groups" });
                      }
                    }}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  />

                  {index > 0 ? (
                    <Action
                      title="Move Up"
                      icon={Icon.ArrowUp}
                      shortcut={Keyboard.Shortcut.Common.MoveUp}
                      onAction={async () => {
                        await moveGroup(group, Direction.UP, groupStore);
                      }}
                    />
                  ) : null}
                  {index < groupStore.objects.length - 1 ? (
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      shortcut={Keyboard.Shortcut.Common.MoveDown}
                      onAction={async () => {
                        await moveGroup(group, Direction.DOWN, groupStore);
                      }}
                    />
                  ) : null}
                </ActionPanel.Section>
                <CreateNewItemAction itemType={ItemType.GROUP} formView={<GroupForm />} />
                <Action.Push
                  title="Create Subgroup"
                  icon={Icon.Layers}
                  target={
                    <GroupForm
                      group={buildGroup({
                        name: "",
                        icon: group.icon,
                        iconColor: group.iconColor,
                        parent: group.id,
                        sortStrategy: group.sortStrategy,
                      })}
                    />
                  }
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                />
                {!examplesInstalled ? (
                  <InstallExamplesAction setExamplesInstalled={setExamplesInstalled} kind="groups" />
                ) : null}
                <CopyGroupActionsSubmenu group={group} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function ViewGroupsCommand() {
  return (
    <DataStorageProvider>
      <GroupList />
    </DataStorageProvider>
  );
}
