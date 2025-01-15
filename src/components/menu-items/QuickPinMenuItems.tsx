import { Application, getSelectedText, Icon, MenuBarExtra } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useDataStorageContext } from "../../contexts/DataStorageContext";
import { StorageKey, KEYBOARD_SHORTCUT } from "../../lib/common";
import { buildGroup, Group } from "../../lib/group";
import { buildPin } from "../../lib/pin";
import { FileRef, NoteRef, TabRef, TrackRef } from "../../lib/LocalData";
import { cutoff } from "../../lib/utils";
import { utils } from "placeholders-toolkit";
import { getMusicTrackScript, getSpotifyTrackScript, getTVTrackScript } from "../../lib/scripts";

type BaseQuickPinProps = {
  /**
   * The application to pin.
   */
  app: Application;
};

/**
 * A menu item for creating a new pin whose target is the path of the current app.
 * @returns The menu item, or null if the app is not pinnable (e.g. Finder or Desktop).
 */
export function AppQuickPin(props: BaseQuickPinProps) {
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

type DirectoryQuickPinProps = BaseQuickPinProps & {
  /**
   * The current directory of a file manager.
   */
  directory: FileRef;
};

/**
 * A menu item that creates a new pin whose target path is the current directory of Finder.
 * @returns A menu item, or null if the current app is not a file manager.
 */
export function DirectoryQuickPin(props: DirectoryQuickPinProps) {
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

type DocumentQuickPinProps = BaseQuickPinProps & {
  /**
   * The document that is currently open in the frontmost application.
   */
  document: FileRef;
};

/**
 * A menu item that creates a new pin whose target is the path of current document.
 * @returns A menu item, or null if there is no document open in the frontmost application.
 */
export function DocumentQuickPin(props: DocumentQuickPinProps) {
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

type FilesQuickPinProps = BaseQuickPinProps & {
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
export function FilesQuickPin(props: FilesQuickPinProps) {
  const { app, selectedFiles, groups } = props;
  const { pinStore, groupStore } = useDataStorageContext();
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
            const newGroup = buildGroup({
              name: newGroupName,
              icon: "blank-document-16",
            });
            await groupStore.add([newGroup]);
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

type NotesQuickPinProps = BaseQuickPinProps & {
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
export function NotesQuickPin(props: NotesQuickPinProps) {
  const { app, notes, groups } = props;
  const { pinStore, groupStore } = useDataStorageContext();
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
            const newGroup = buildGroup({
              name: newGroupName,
              icon: app.path,
            });
            await groupStore.add([newGroup]);
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

type TabQuickPinProps = BaseQuickPinProps & {
  /**
   * The current tab of a browser.
   */
  tab: TabRef;
};

/**
 * A menu item that creates a new pin whose target URL is the URL of the current browser tab.
 * @returns A menu item, or null if the current application is not a supported browser.
 */
export function TabQuickPin(props: TabQuickPinProps) {
  const { app, tab } = props;
  const { pinStore } = useDataStorageContext();
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  if (!utils.SupportedBrowsers.find((b) => b.name == app.name)) {
    return null;
  }

  let title = `Pin This Tab (${cutoff(tab.name, 20)})`;
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={Icon.AppWindow}
      tooltip="Pin the URL of the current tab"
      shortcut={KEYBOARD_SHORTCUT.PIN_CURRENT_TAB}
      onAction={async () => {
        const newPin = buildPin({
          name: tab.name,
          url: tab.url,
          application: app.name,
          group: targetGroup?.name,
        });
        await pinStore.add([newPin]);
      }}
    />
  );
}

type TabsQuickPinProps = BaseQuickPinProps & {
  /**
   * The tabs currently open in the frontmost browser.
   */
  tabs: TabRef[];

  /**
   * The list of all pin groups.
   */
  groups: Group[];
};

/**
 * A menu item that creates a new pin for each tab in the frontmost browser.
 * @returns A menu item, or null if the current application is not a supported browser or no tabs are open.
 */
export function TabsQuickPin(props: TabsQuickPinProps) {
  const { app, tabs, groups } = props;
  const { pinStore, groupStore } = useDataStorageContext();
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  if (!utils.SupportedBrowsers.find((b) => b.name == app?.name) || tabs.length == 0) {
    return null;
  }

  let title = `Pin All Tabs (${tabs.length})`;
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={Icon.AppWindowGrid3x3}
      tooltip="Pin all tabs in the frontmost browser window"
      shortcut={KEYBOARD_SHORTCUT.PIN_ALL_TABS}
      onAction={async () => {
        let newGroupName = "New Tab Group";
        if (targetGroup) {
          newGroupName = targetGroup.name;
        } else {
          let iter = 2;
          while (groups.map((group) => group.name).includes(newGroupName)) {
            newGroupName = `New Tab Group (${iter})`;
            iter++;
          }
          const newGroup = buildGroup({
            name: newGroupName,
            icon: "app-window-grid-3x3-16",
          });
          await groupStore.add([newGroup]);
        }
        for (const tab of tabs) {
          const newPin = buildPin({
            name: tab.name,
            url: tab.url,
            application: app.name,
            group: newGroupName,
          });
          await pinStore.add([newPin]);
        }
      }}
    />
  );
}

/**
 * A menu item that creates a new pin whose target is the currently selected text.
 * @returns A menu item.
 */
export function TextQuickPin() {
  const { pinStore } = useDataStorageContext();
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  let title = "Pin Selected Text";
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={Icon.Text}
      tooltip="Pin the selected text as a text fragment"
      shortcut={KEYBOARD_SHORTCUT.PIN_SELECTED_TEXT}
      onAction={async () => {
        const text = await getSelectedText();
        const newPin = buildPin({
          name: text.substring(0, 50).trim(),
          url: text,
          icon: "text-16",
          group: targetGroup?.name,
        });
        await pinStore.add([newPin]);
      }}
    />
  );
}

type TrackQuickPinProps = BaseQuickPinProps & {
  /**
   * The current track in Music, Spotify, or TV.
   */
  track: TrackRef;
};

/**
 * A menu item that creates a new pin whose target script plays the current track in Music, Spotify, or TV.
 * @returns A menu item, or null if there is no track playing.
 */
export function TrackQuickPin(props: TrackQuickPinProps) {
  const { app, track } = props;
  const { pinStore } = useDataStorageContext();
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  if (track.name == "") {
    return null;
  }

  let title = `Pin This Track (${cutoff(track.name, 20)})`;
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={{ fileIcon: app.path }}
      tooltip="Pin the path of the current track"
      shortcut={KEYBOARD_SHORTCUT.PIN_CURRENT_TRACK}
      onAction={async () => {
        let trackScript = "return";

        if (app.name == "Music") {
          trackScript = getMusicTrackScript(track.name, track.artist, track.album);
        } else if (app.name == "Spotify.app") {
          trackScript = getSpotifyTrackScript(track.uri);
        } else if (app.name == "TV") {
          trackScript = getTVTrackScript(track.name, track.artist, track.album);
        }

        const newPin = buildPin({
          name: track.name,
          url: `{{as:${trackScript}}}`,
          icon: app.path,
          group: targetGroup?.name,
        });
        await pinStore.add([newPin]);
      }}
    />
  );
}
