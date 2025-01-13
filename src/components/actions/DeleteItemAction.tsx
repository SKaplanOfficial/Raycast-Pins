import { Action, Alert, confirmAlert, Icon, Keyboard } from "@raycast/api";
import { Pin } from "../../lib/Pins";
import { LocalObjectType } from "../../hooks/useLocalObjectStore";
import { Group } from "../../lib/Groups";
import { Tag } from "../../lib/tag";

/**
 * Action to delete an item. Prompts the user to confirm the deletion.
 * @param props.item The item to delete.
 * @param props.onCancel A callback to run if the user cancels the deletion.
 * @param props.onDelete A callback to run if the user confirms the deletion.
 * @param props.onCompletion A callback to run after the deletion is complete.
 * @param props.requireConfirmation Whether to require confirmation before deleting.
 * @returns An action component.
 */
export default function DeleteItemAction<T>(props: {
  item: (Pin | Group | Tag) & LocalObjectType<T>;
  onCancel?: () => void;
  onDelete: (item: LocalObjectType<T>) => Promise<void>;
  onCompletion?: () => void;
  requireConfirmation?: boolean;
  customTitle?: string;
}) {
  const { item, onCancel, onDelete, onCompletion, requireConfirmation, customTitle } = props;
  return (
    <Action
      title={customTitle || `Delete ${item.itemType}`}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={Keyboard.Shortcut.Common.Remove}
      onAction={async () => {
        if (requireConfirmation === false ||
          await confirmAlert({
            title: `Delete ${item.itemType} "${item.name}"`,
            message: "Are you sure?",
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          })
        ) {
          await onDelete(item);
        } else {
          onCancel?.();
        }
        onCompletion?.();
      }}
    />
  );
}
