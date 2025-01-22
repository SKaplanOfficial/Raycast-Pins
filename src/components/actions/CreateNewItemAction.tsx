import { Icon, Action, Keyboard } from "@raycast/api";
import { ItemType } from "../../lib/common";

/**
 * Action to create a new item. Opens the provided form view.
 * @param props.itemType The type of item to create. See {@link ItemType}.
 * @param props.formView The form view to open.
 */
export default function CreateNewItemAction(props: { itemType: ItemType; formView: JSX.Element }) {
  const { itemType, formView } = props;
  return (
    <Action.Push
      title={`Create New ${itemType}`}
      icon={Icon.PlusCircle}
      shortcut={Keyboard.Shortcut.Common.New}
      target={formView}
    />
  );
}
