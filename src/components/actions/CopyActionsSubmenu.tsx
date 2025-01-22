import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { Pin } from "../../lib/pin";
import { Group } from "../../lib/group";
import { Tag } from "../../lib/tag";

/**
 * Submenu for actions to copy an item's information to the clipboard.
 * @param props.item The pin or group to copy information about.
 * @param props.children Additional actions to include in the submenu.
 */
export default function CopyActionsSubmenu(props: { item: Pin | Group | Tag; children?: React.ReactNode }) {
  const { item, children } = props;

  return (
    <ActionPanel.Submenu title="Clipboard Actions" icon={Icon.Clipboard} shortcut={Keyboard.Shortcut.Common.Copy}>
      <Action.CopyToClipboard
        title={`Copy ${item.itemType} Name`}
        content={item.name}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.CopyToClipboard
        title={`Copy ${item.itemType} ID`}
        content={item.id}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      />
      <Action.CopyToClipboard
        title={`Copy ${item.itemType} JSON`}
        content={JSON.stringify(item)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
      />
      {children}
    </ActionPanel.Submenu>
  );
}
