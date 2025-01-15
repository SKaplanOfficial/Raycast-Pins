import { Application, MenuBarExtra } from "@raycast/api";
import { NoteRef } from "../../../lib/LocalData";
import { cutoff } from "../../../lib/utils";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/common";
import { Group, createNewGroup } from "../../../lib/Groups";
import { useCachedState } from "@raycast/utils";
import { buildPin } from "../../../lib/pin";
import { useDataStorageContext } from "../../../contexts/DataStorageContext";

type NotesQuickPinProps = {
  /**
   * The current application.
   */
  app: Application;

  /**
   * The currently selected notes in Notes.
   */
  notes: NoteRef[];

  /**
   * The list of all pin groups.
   */
  groups: Group[];
};

/**
 * A menu item that creates a new pin for each selected note in Notes.
 * @returns A menu item, or null if the current app is not Notes or no notes are selected.
 */
export default function NotesQuickPin(props: NotesQuickPinProps) {
  const { app, notes, groups } = props;
  const { pinStore } = useDataStorageContext();
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  if (app.name != "Notes" || notes.length == 0) {
    return null;
  }

  let title = `Pin ${notes.length > 1 ? `These Notes (${notes.length})` : `This Note (${cutoff(notes[0].name, 20)})`}`;
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={{ fileIcon: app.path }}
      tooltip="Pin the selected notes"
      shortcut={KEYBOARD_SHORTCUT.PIN_SELECTED_NOTES}
      onAction={async () => {
        if (notes.length == 1) {
          const cmd = `osascript -e 'Application("Notes").notes.byId("${notes[0].id}").show()' -l "JavaScript"`;
          const newPin = buildPin({
            name: notes[0].name,
            url: cmd,
            icon: app.path,
            group: targetGroup?.name,
          });
          await pinStore.add([newPin]);
        } else {
          let newGroupName = "New Note Group";
          if (targetGroup) {
            newGroupName = targetGroup.name;
          } else {
            let iter = 2;
            while (groups.map((group) => group.name).includes(newGroupName)) {
              newGroupName = `New Note Group (${iter})`;
              iter++;
            }
            await createNewGroup({ name: newGroupName, icon: app.path });
          }
          for (const note of notes) {
            const cmd = `osascript -e 'Application("Notes").notes.byId("${note.id}").show()' -l "JavaScript"`;
            const newPin = buildPin({
              name: note.name,
              url: cmd,
              icon: app.path,
              group: newGroupName,
            });
            await pinStore.add([newPin]);
          }
        }
      }}
    />
  );
}
