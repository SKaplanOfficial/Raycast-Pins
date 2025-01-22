import { Action, Alert, confirmAlert, Icon, Keyboard, showToast } from "@raycast/api";
import { LocalObjectType } from "../../hooks/useLocalObjectStore";

type DeleteItemOptions = {
  onCancel?: () => void;
  onCompletion?: () => void;
  requireConfirmation?: boolean;
  customTitle?: string;
  displayToast?: boolean;
};

export async function deleteItem<T>(
  item: LocalObjectType<T> & { itemType: string; name: string },
  onDelete: (item: LocalObjectType<T> & { itemType: string; name: string }) => Promise<void>,
  options?: DeleteItemOptions,
) {
  if (
    options?.requireConfirmation === false ||
    (await confirmAlert({
      title: `Delete ${item.itemType} "${item.name}"`,
      message: "Are you sure?",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    }))
  ) {
    await onDelete(item);
  } else {
    options?.onCancel?.();
  }
  if (options?.displayToast !== false) {
    await showToast({ title: `Deleted ${item.itemType} "${item.name}"` });
  }
  options?.onCompletion?.();
}

/**
 * Action to delete an item. Prompts the user for confirmation.
 * @param props.item The item to delete.
 * @param props.onCancel A callback to run if the user cancels the deletion.
 * @param props.onDelete A callback to run if the user confirms the deletion.
 * @param props.onCompletion A callback to run after the deletion is complete.
 * @param props.requireConfirmation Whether to require confirmation before deleting.
 * @param props.customTitle A custom title for the action.
 * @param props.displayToast Whether to display a toast message after deletion.
 * @returns An action component.
 */
export default function DeleteItemAction<T>(props: {
  item: LocalObjectType<T> & { itemType: string; name: string };
  onDelete: (item: LocalObjectType<T> & { itemType: string; name: string }) => Promise<void>;
  options?: DeleteItemOptions;
}) {
  const { item, onDelete, options } = props;
  return (
    <Action
      title={options?.customTitle || `Delete ${item.itemType}`}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={Keyboard.Shortcut.Common.Remove}
      onAction={async () => {
        await deleteItem(item, onDelete, options);
      }}
    />
  );
}
