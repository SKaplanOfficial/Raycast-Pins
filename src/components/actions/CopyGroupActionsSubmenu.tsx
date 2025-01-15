import { Action, ActionPanel, Clipboard, Icon, showHUD } from "@raycast/api";
import { Pin } from "../../lib/pin";
import { Group, getGroupStatistics } from "../../lib/Groups";
import { useDataStorageContext } from "../../contexts/DataStorageContext";

/**
 * Submenu for actions that copy information about a group to the clipboard.
 * @param props.group The group to copy information about.
 * @returns A submenu component.
 */
export default function CopyGroupActionsSubmenu(props: { group: Group }) {
  const { group } = props;
  const { pinStore, groupStore } = useDataStorageContext();

  return (
    <ActionPanel.Submenu title="Clipboard Actions" icon={Icon.Clipboard}>
      <Action.CopyToClipboard
        title="Copy Group Name"
        content={group.name}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.CopyToClipboard
        title="Copy Group ID"
        content={group.id.toString()}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      />
      <Action
        title="Copy Group JSON"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
        onAction={async () => {
          const data = {
            groups: [group],
            pins: pinStore.objects.filter((pin: Pin) => pin.group == group.name),
          };

          const jsonData = JSON.stringify(data);
          await Clipboard.copy(jsonData);
          await showHUD("Copied JSON to Clipboard");
        }}
      />
      <Action.CopyToClipboard
        title="Copy Formatted Group Statistics"
        content={getGroupStatistics(group, groupStore.objects, pinStore.objects) as string}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      />
      <Action.CopyToClipboard
        title="Copy Group Statistics as JSON"
        content={JSON.stringify(getGroupStatistics(group, groupStore.objects, pinStore.objects, "object"))}
        shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "j" }}
      />
    </ActionPanel.Submenu>
  );
}
