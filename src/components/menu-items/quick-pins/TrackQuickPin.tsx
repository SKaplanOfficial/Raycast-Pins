import { Application, MenuBarExtra } from "@raycast/api";
import { TrackRef } from "../../../lib/LocalData";
import { cutoff } from "../../../lib/utils";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/common";
import { getMusicTrackScript, getSpotifyTrackScript, getTVTrackScript } from "../../../lib/scripts";
import { useCachedState } from "@raycast/utils";
import { Group } from "../../../lib/Groups";
import { buildPin } from "../../../lib/pin";
import { useDataStorageContext } from "../../../contexts/DataStorageContext";

type TrackQuickPinProps = {
  /**
   * The current application.
   */
  app: Application;

  /**
   * The current track in Music, Spotify, or TV.
   */
  track: TrackRef;
};

/**
 * A menu item that creates a new pin whose target script plays the current track in Music, Spotify, or TV.
 * @returns A menu item, or null if there is no track playing.
 */
export default function TrackQuickPin(props: TrackQuickPinProps) {
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
