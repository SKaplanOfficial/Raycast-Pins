import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List } from "@raycast/api";
import useLocalObjectStore from "./hooks/useLocalObjectStore";
import { Tag } from "./lib/tag";
import { storageMethods } from "./lib/storage";
import TagForm from "./components/TagForm";
import { useEffect, useState } from "react";
import { getPins, Pin } from "./lib/Pins";

/**
 * Raycast command to view all currently used tags.
 */
export default function ViewTagsCommand() {
  const tagsStore = useLocalObjectStore<Tag>("local-tags", storageMethods);
  const [associations, setAssociations] = useState<{ [key: string]: { tag: Tag, pins: Pin[] } }>({});

  async function findAssociations() {
    const pins = await getPins();
    const foundAssociations = tagsStore.objects.reduce((acc, tag) => {
      const pinsWithTag = pins.filter((pin) => pin.tags?.includes(tag.name));
      acc[tag.id] = { tag, pins: pinsWithTag };
      return acc;
    }, {} as { [key: string]: { tag: Tag, pins: Pin[] } });
    setAssociations(foundAssociations);
  }

  useEffect(() => {
    if (!tagsStore.loading) {
      findAssociations();
    }
  }, [tagsStore.loading, tagsStore.objects]);

  return (
    <List
      isLoading={tagsStore.loading}
      searchBarPlaceholder="Filter tags..."
      actions={
        <ActionPanel>
          {/* <Action
            title="Test"
            onAction={() => {
              const { duplicateGroups } = tagsStore.deduplicate(["name", "aliases"]);
              console.log(duplicateGroups);
            }}
          />
          <Action
            title="Save"
            onAction={() => {
              tagsStore.save();
            }}
          /> */}
        </ActionPanel>
      }
    >
      {tagsStore.objects.map((tag) => (
        <List.Item
          key={tag.id}
          title={tag.name}
          subtitle={tag.aliases.length ? `${tag.aliases.join(", ")}` : undefined}
          keywords={[...tag.aliases.flatMap((alias) => alias.split(/[\s-#_$~|*/\\><:;=%]+/)), tag.name]}
          icon={{ source: Icon.Tag, tintColor: tag.color }}
          accessories={[
            {
              tag: {
                value: associations[tag.id]?.pins.length.toString() || "0",
              },
              icon: Icon.Pin,
              tooltip: `Number of associated pins: ${associations[tag.id]?.pins.length || 0}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit"
                icon={Icon.Pencil}
                target={<TagForm tag={tag} tagStore={tagsStore} />}
                shortcut={Keyboard.Shortcut.Common.Edit}
              />

              <Action
                title="Delete Tag"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: `Delete Tag "${tag.name}"`,
                      message: "Are you sure?",
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    })
                  ) {
                    await tagsStore.remove(tag);
                  }
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
                    await tagsStore.clear();
                  }
                }}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.RemoveAll}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
