import { Action, ActionPanel, Alert, confirmAlert, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import { Tag } from "./lib/tag";
import TagForm from "./components/TagForm";
import { useEffect, useMemo, useState } from "react";
import { getPins, openPin, Pin } from "./lib/Pins";
import { ItemType, SORT_FN, StorageKey } from "./lib/constants";
import { pluralize } from "./lib/utils";
import DeleteItemAction from "./components/actions/DeleteItemAction";
import TagStoreProvider, { useTagStoreContext } from "./contexts/TagStoreContext";
import CreateNewItemAction from "./components/actions/CreateNewItemAction";
import { setStorage } from "./lib/storage";

export function TagsList() {
  const tagStore = useTagStoreContext();
  const [associations, setAssociations] = useState<{ [key: string]: { tag: Tag; pins: Pin[] } }>({});
  const preferences = getPreferenceValues<ExtensionPreferences>();

  // const sortedTags = useMemo(() => tagStore.objects.sort(SORT_FN.ALPHA_ASC), [tagStore.objects]);
  // const [sortedTags, setSortedTags] = useState<LocalObjectType<Tag>[]>([]);
  const sortedTags = [...tagStore.objects].sort(SORT_FN.ALPHA_ASC);

  async function findAssociations() {
    const pins = await getPins();
    const foundAssociations = tagStore.objects.reduce(
      (acc, tag) => {
        const pinsWithTag = pins.filter((pin) => pin.tags?.includes(tag.name));
        acc[tag.id] = { tag, pins: pinsWithTag };
        return acc;
      },
      {} as { [key: string]: { tag: Tag; pins: Pin[] } },
    );
    setAssociations(foundAssociations);
  }

  useEffect(() => {
    if (!tagStore.loading) {
      findAssociations();
    }
  }, [tagStore.loading, tagStore.objects]);

  // Why does this keep switching between "aliases: [ 'artificial', 'intel' ]" and "aliases: [ 'artificial', 'intel', [length]: 2 ]"?
  console.log("SORTEDTAGS", sortedTags);

  return (
    <List
      isLoading={tagStore.loading}
      searchBarPlaceholder="Filter tags..."
      actions={
        <ActionPanel>
          <CreateNewItemAction itemType={ItemType.TAG} formView={<TagForm tagStore={tagStore} />} />
        </ActionPanel>
      }
    >
      <List.EmptyView title="No Tags Yet!" description="Add a new tag (⌘N) to get started." icon="no-view.png" />
      {sortedTags.map((tag) => {
        const associatedPins = associations[tag.id]?.pins ?? [];
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
                tooltip: `Number of associated pins: ${associations[tag.id]?.pins.length || 0}`,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Tag Actions">
                  <Action.Push
                    title="Edit Tag"
                    icon={Icon.Pencil}
                    target={<TagForm tag={tag} tagStore={tagStore} />}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                  />

                  {associatedPins.length > 0 ? (
                    <Action
                      title={`Open ${associatedPins.length} ${pluralize("Pin", associatedPins.length)}`}
                      icon={Icon.ChevronRight}
                      onAction={async () => {
                        await Promise.all(
                          associatedPins.map(async (pin) => {
                            await openPin(pin, preferences);
                          }),
                        );
                      }}
                    />
                  ) : null}
                  <DeleteItemAction item={tag} onDelete={async (tag) => {
                    await tagStore.remove(tag)
                    const pins = await getPins();
                    const updatedPins = pins.map((pin) => ({
                      ...pin,
                      tags: pin.tags?.filter((pinTag) => pinTag !== tag.name),
                    }));
                    await setStorage(StorageKey.LOCAL_PINS, updatedPins);
                    }} />
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
                <CreateNewItemAction itemType={ItemType.TAG} formView={<TagForm tagStore={tagStore} />} />
                <ActionPanel.Submenu
                  title="Clipboard Actions"
                  icon={Icon.Clipboard}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                >
                  <Action.CopyToClipboard
                    title="Copy Tag Name"
                    content={tag.name}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Tag ID"
                    content={tag.id.toString()}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Tag Notes"
                    content={tag.notes}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Tag JSON"
                    content={JSON.stringify(tag)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
                  />
                </ActionPanel.Submenu>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

/**
 * Raycast command to view all currently used tags.
 */
export default function ViewTagsCommands() {
  return (
    <TagStoreProvider>
      <TagsList />
    </TagStoreProvider>
  );
}
