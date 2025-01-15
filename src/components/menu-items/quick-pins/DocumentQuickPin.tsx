import { Application, MenuBarExtra } from "@raycast/api";
import { FileRef } from "../../../lib/LocalData";
import { cutoff } from "../../../lib/utils";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/common";
import { useCachedState } from "@raycast/utils";
import { Group } from "../../../lib/Groups";
import { buildPin } from "../../../lib/pin";
import { useDataStorageContext } from "../../../contexts/DataStorageContext";

type DocumentQuickPinProps = {
  /**
   * The current application.
   */
  app: Application;

  /**
   * The document that is currently open in the frontmost application.
   */
  document: FileRef;
};

/**
 * A menu item that creates a new pin whose target is the path of current document.
 * @returns A menu item, or null if there is no document open in the frontmost application.
 */
export default function DocumentQuickPin(props: DocumentQuickPinProps) {
  const { app, document } = props;
  const { pinStore } = useDataStorageContext();
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  if (document.path == "") {
    return null;
  }

  let title = `Pin This Document (${cutoff(document.name, 20)})`;
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={{ fileIcon: app.path }}
      tooltip={`Pin the path of the current document in ${app.name}`}
      shortcut={KEYBOARD_SHORTCUT.PIN_CURRENT_DOCUMENT}
      onAction={async () => {
        const newPin = buildPin({
          name: document.name,
          url: document.path,
          group: targetGroup?.name,
        });
        await pinStore.add([newPin]);
      }}
    />
  );
}
