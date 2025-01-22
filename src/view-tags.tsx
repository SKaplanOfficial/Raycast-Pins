import { Action, ActionPanel, Alert, confirmAlert, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import TagForm from "./components/TagForm";
import { useMemo } from "react";
import { getPins, openPin, Pin } from "./lib/pin";
import { ItemType, SORT_FN } from "./lib/common";
import { pluralize } from "./lib/utils";
import DeleteItemAction from "./components/actions/DeleteItemAction";
import CreateNewItemAction from "./components/actions/CreateNewItemAction";
import DataStorageProvider, { useDataStorageContext } from "./contexts/DataStorageContext";
import CopyActionsSubmenu from "./components/actions/CopyActionsSubmenu";

export function TagList() {
  const { pinStore, tagStore, loadingStores, tagAssociations } = useDataStorageContext();
  const sortedTags = useMemo(() => tagStore.objects.sort(SORT_FN.ALPHA_ASC), [tagStore.objects]);
  const preferences = getPreferenceValues<ExtensionPreferences>();

  return (
    <List
      isLoading={loadingStores}
      searchBarPlaceholder="Filter tags..."
      actions={
        <ActionPanel>
          <CreateNewItemAction itemType={ItemType.TAG} formView={<TagForm />} />
        </ActionPanel>
      }
    >
      <List.EmptyView title="No Tags Yet!" description="Create a tag (⌘N) to get started." icon="no-view.png" />
      {sortedTags.map((tag) => {
        const associatedPins = tagAssociations[tag.id].pins;
        return (
          <List.Item
            key={tag.id}
            title={tag.name}
            subtitle={tag.aliases.length ? `${tag.aliases.join(", ")}` : undefined}
            keywords={[...tag.aliases.flatMap((alias) => alias.split(/[\s-#_$~|*/\\><:;=%]+/)), tag.name]}
            icon={{ source: Icon.Tag, tintColor: tag.color }}
            accessories={[
              {
                tag: {
                  value: associatedPins.length.toString(),
                },
                icon: Icon.Pin,
                tooltip: `${associatedPins.length || 0} associated ${pluralize("pin", associatedPins.length)}`,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Tag Actions">
                  <Action.Push
                    title="Edit Tag"
                    icon={Icon.Pencil}
                    target={<TagForm tag={tag} />}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                  />

                  {associatedPins.length > 0 ? (
                    <Action
                      title={`Open ${associatedPins.length} ${pluralize("Pin", associatedPins.length)}`}
                      icon={Icon.ChevronRight}
                      onAction={async () => {
                        await Promise.all(
                          associatedPins.map(async (pinID) => {
                            const pin = pinStore.objects.find((pin) => pin.id === pinID);
                            if (!pin) return;
                            await openPin(pin, preferences, async (pin: Pin) => {
                              await pinStore.update([pin]);
                            });
                          }),
                        );
                      }}
                    />
                  ) : null}
                  <DeleteItemAction
                    item={tag}
                    onDelete={async (tag) => {
                      await tagStore.remove([tag]);
                      const pins = await getPins();
                      const updatedPins = pins.map((pin) => ({
                        ...pin,
                        tags: pin.tags?.filter((pinTag) => pinTag !== tag.name),
                      }));
                      await pinStore.update(updatedPins);
                    }}
                  />
                  <Action
                    title="Delete All Tags"
                    icon={Icon.Trash}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete All Tags",
                          message: "Are you sure?",
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        await tagStore.clear();
                      }
                    }}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  />
                </ActionPanel.Section>
                <CreateNewItemAction itemType={ItemType.TAG} formView={<TagForm />} />
                <CopyActionsSubmenu item={tag}>
                  <Action.CopyToClipboard
                    title="Copy Tag Notes"
                    content={tag.notes}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
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

export default function ViewTagsCommand() {
  return (
    <DataStorageProvider>
      <TagList />
    </DataStorageProvider>
  );
}
