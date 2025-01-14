import { Icon, MenuBarExtra, getSelectedText } from "@raycast/api";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/constants";
import { useCachedState } from "@raycast/utils";
import { Group } from "../../../lib/Groups";
import { buildPin } from "../../../lib/Pins";
import { usePinStoreContext } from "../../../contexts/PinStoreContext";

/**
 * A menu bar extra item that creates a new pin whose target is the currently selected text.
 * @returns A menu bar extra.
 */
export default function TextQuickPin() {
  const { add: addPin } = usePinStoreContext();
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  let title = "Pin Selected Text";
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={Icon.Text}
      tooltip="Pin the currently selected text as a text fragment"
      shortcut={KEYBOARD_SHORTCUT.PIN_SELECTED_TEXT}
      onAction={async () => {
        const text = await getSelectedText();
        const newPin = buildPin({
          name: text.substring(0, 50).trim(),
          url: text,
          icon: "text-16",
          group: targetGroup?.name,
        });
        await addPin([newPin]);
      }}
    />
  );
}
