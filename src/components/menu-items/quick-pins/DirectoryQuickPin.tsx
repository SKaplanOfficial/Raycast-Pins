import { Application, MenuBarExtra } from "@raycast/api";
import { FileRef } from "../../../lib/LocalData";
import { cutoff } from "../../../lib/utils";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/common";
import { useCachedState } from "@raycast/utils";
import { Group } from "../../../lib/Groups";
import { buildPin } from "../../../lib/pin";
import { useDataStorageContext } from "../../../contexts/DataStorageContext";

type DirectoryQuickPinProps = {
  /**
   * The current application.
   */
  app: Application;

  /**
   * The current directory of a file manager.
   */
  directory: FileRef;
};

/**
 * A menu item that creates a new pin whose target path is the current directory of Finder.
 * @returns A menu item, or null if the current app is not a file manager.
 */
export default function DirectoryQuickPin(props: DirectoryQuickPinProps) {
  const { app, directory } = props;
  const { pinStore } = useDataStorageContext();
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  // TODO: PathFinder
  if (app.name != "Finder" || directory.name == "Desktop") {
    return null;
  }

  let title = `Pin This Directory (${cutoff(directory.name, 20)})`;
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={{ fileIcon: directory.path }}
      tooltip="Pin the path of the current directory"
      shortcut={KEYBOARD_SHORTCUT.PIN_CURRENT_DIRECTORY}
      onAction={async () => {
        const newPin = buildPin({
          name: directory.name,
          url: directory.path,
          group: targetGroup?.name,
        });
        await pinStore.add([newPin]);
      }}
    />
  );
}
