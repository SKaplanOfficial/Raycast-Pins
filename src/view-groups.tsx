import {
    Action, ActionPanel, Alert, confirmAlert, getPreferenceValues, Icon, Keyboard, List, showToast
} from '@raycast/api';

import CopyActionsSubmenu from './components/actions/CopyActionsSubmenu';
import CreateNewItemAction from './components/actions/CreateNewItemAction';
import DeleteItemAction from './components/actions/DeleteItemAction';
import { InstallExamplesAction } from './components/actions/InstallExamplesAction';
import GroupForm from './components/GroupForm';
import DataStorageProvider, { useDataStorageContext } from './contexts/DataStorageContext';
import useExamples from './hooks/useExamples';
import { LocalObjectStore } from './hooks/useLocalObjectStore';
import { getGroupAccessories } from './lib/accessories';
import { Direction, ItemType } from './lib/common';
import { buildGroup, deleteGroup, getGroupStatistics, Group } from './lib/group';
import { openPin, Pin } from './lib/pin';
import { ExtensionPreferences, ViewGroupsPreferences } from './lib/preferences';
import { getGroupIcon, pluralize } from './lib/utils';

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

export function GroupList() {
  const { pinStore, groupStore, loadingStores } = useDataStorageContext();
  const { examplesInstalled, setExamplesInstalled } = useExamples([ItemType.GROUP]);
  const preferences = getPreferenceValues<ExtensionPreferences & ViewGroupsPreferences>();

  return (
    <List
      isLoading={loadingStores}
      searchBarPlaceholder="Search groups..."
      actions={
        <ActionPanel>
          <CreateNewItemAction itemType={ItemType.GROUP} formView={<GroupForm />} />
          {!examplesInstalled || groupStore.objects.length == 0 ? (
            <InstallExamplesAction kind={ItemType.GROUP} onInstall={() => setExamplesInstalled(true)} />
          ) : null}
        </ActionPanel>
      }
    >
      <List.EmptyView
        title="No Groups Yet!"
        description="Create a group (⌘N) or install some examples (⌘E)"
        icon="no-view.png"
      />
      {groupStore.objects.map((group, index) => {
        const groupPins = pinStore.objects.filter((pin: Pin) => pin.group == group.name);
        const accessories = getGroupAccessories(group, groupStore.objects, preferences);

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
                          await openPin(pin, preferences, async (pin: Pin) => {
                            await pinStore.update([pin]);
                          });
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
                  <InstallExamplesAction kind={ItemType.GROUP} onInstall={() => setExamplesInstalled(true)} />
                ) : null}
                <CopyActionsSubmenu item={group}>
                  <Action.CopyToClipboard
                    title={`Copy Formatted Group Statistics`}
                    content={getGroupStatistics(group, groupStore.objects, pinStore.objects) as string}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  />
                  <Action.CopyToClipboard
                    title={`Copy Group Statistics JSON`}
                    content={JSON.stringify(getGroupStatistics(group, groupStore.objects, pinStore.objects, "object"))}
                    shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "j" }}
                  />
                </CopyActionsSubmenu>
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
