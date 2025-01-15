import { Application, MenuBarExtra } from "@raycast/api";
import { FileRef } from "../../../lib/LocalData";
import { Group, createNewGroup } from "../../../lib/Groups";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/common";
import { cutoff } from "../../../lib/utils";
import { useCachedState } from "@raycast/utils";
import { buildPin } from "../../../lib/pin";
import { useDataStorageContext } from "../../../contexts/DataStorageContext";

type FilesQuickPinProps = {
  /**
   * The current application.
   */
  app: Application;

  /**
   * The files currently selected in the file manager.
   */
  selectedFiles: FileRef[];

  /**
   * The list of all pin groups.
   */
  groups: Group[];
};

/**
 * A menu item that creates a new pin for each selected file.
 * @returns A menu item, or null if the current app is not a file manager.
 */
export default function FilesQuickPin(props: FilesQuickPinProps) {
  const { app, selectedFiles, groups } = props;
  const { pinStore } = useDataStorageContext();
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  // TODO: PathFinder
  if (app.name != "Finder" || selectedFiles.length == 0) {
    return null;
  }

  let title = `Pin ${
    selectedFiles.length > 1
      ? `These Files (${selectedFiles.length})`
      : `This File (${cutoff(selectedFiles[0].name, 20)})`
  }`;
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={{ fileIcon: selectedFiles[0].path }}
      tooltip="Pin the selected files"
      shortcut={KEYBOARD_SHORTCUT.PIN_SELECTED_FILES}
      onAction={async () => {
        if (selectedFiles.length == 1) {
          const newPin = buildPin({
            name: selectedFiles[0].name,
            url: selectedFiles[0].path,
            group: targetGroup?.name,
          });
          await pinStore.add([newPin]);
        } else {
          let newGroupName = "New File Group";
          if (targetGroup) {
            newGroupName = targetGroup.name;
          } else {
            let iter = 2;
            while (groups.map((group) => group.name).includes(newGroupName)) {
              newGroupName = `New File Group (${iter})`;
              iter++;
            }
            await createNewGroup({
              name: newGroupName,
              icon: "blank-document-16",
            });
          }
          for (const file of selectedFiles) {
            const newPin = buildPin({
              name: file.name,
              url: file.path,
              group: newGroupName,
            });
            await pinStore.add([newPin]);
          }
        }
      }}
    />
  );
}
