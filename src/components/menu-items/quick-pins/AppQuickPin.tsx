import { Application, MenuBarExtra } from "@raycast/api";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/common";
import { useCachedState } from "@raycast/utils";
import { Group } from "../../../lib/Groups";
import { buildPin } from "../../../lib/pin";
import { useDataStorageContext } from "../../../contexts/DataStorageContext";

type AppQuickPinProps = {
  /**
   * The application to pin.
   */
  app: Application;
};

/**
 * A menu item for creating a new pin whose target is the path of the current app.
 * @returns The menu item, or null if the app is not pinnable (e.g. Finder or Desktop).
 */
export default function AppQuickPin(props: AppQuickPinProps) {
  const { app } = props;
  const { pinStore } = useDataStorageContext();
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  if (app.name.length == 0 || app.name == "Finder" || app.name == "Desktop") {
    return null;
  }

  let title = `Pin This App (${app.name.substring(0, 20)})`;
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={{ fileIcon: app.path }}
      tooltip="Pin the path of the current app"
      shortcut={KEYBOARD_SHORTCUT.PIN_CURRENT_APP}
      onAction={async () => {
        const newPin = buildPin({
          name: app.name,
          url: app.path,
          group: targetGroup?.name,
        });
        await pinStore.add([newPin]);
      }}
    />
  );
}
