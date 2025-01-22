import { bulkApply } from "placeholders-toolkit/dist/lib/apply";
import { useEffect, useState } from "react";

import { Clipboard, launchCommand, LaunchType, MenuBarExtra, showToast } from "@raycast/api";

import { useDataStorageContext } from "../../contexts/DataStorageContext";
import { Visibility } from "../../lib/common";
import { LocalDataObject } from "../../lib/LocalData";
import { openPin, Pin } from "../../lib/pin";
import { PinsInfoPlaceholders } from "../../lib/placeholders";
import { ExtensionPreferences, PinsMenubarPreferences, RightClickAction } from "../../lib/preferences";
import { cutoff, getPinIcon } from "../../lib/utils";
import { deleteItem } from "../actions/DeleteItemAction";

/**
 * A menu item for a pin.
 * @param props.pin The pin to display.
 * @param props.preferences The preferences for the extension.
 * @param props.relevant Whether or not the pin is relevant to the current context.
 * @param props.localData The local data object specifying the current context.
 */
export default function PinMenuItem(props: {
  pin: Pin;
  preferences: ExtensionPreferences & PinsMenubarPreferences;
  relevant: boolean;
  localData: LocalDataObject;
}) {
  const { pin, relevant, preferences, localData } = props;
  const { pinStore } = useDataStorageContext();
  const [title, setTitle] = useState<string>(pin.name || cutoff(pin.url, 20));

  useEffect(() => {
    (async () => {
      const newTitle = await bulkApply(title, { allPlaceholders: PinsInfoPlaceholders });
      setTitle(newTitle);
    })();
  }, []);

  return (
    <MenuBarExtra.Item
      key={pin.id}
      icon={getPinIcon(pin)}
      title={title}
      subtitle={relevant ? "  ✧" : ""}
      tooltip={pin.tooltip}
      shortcut={pin.shortcut}
      onAction={async (event) => {
        if (event.type == "left-click") {
          await openPin(
            pin,
            preferences,
            async (pin: Pin) => {
              await pinStore.update([pin]);
            },
            localData as unknown as { [key: string]: string },
          );
        } else {
          switch (preferences.rightClickAction) {
            case RightClickAction.Open:
              await openPin(
                pin,
                preferences,
                async (pin: Pin) => {
                  await pinStore.update([pin]);
                },
                localData as unknown as { [key: string]: string },
              );
              break;
            case RightClickAction.Delete:
              await deleteItem(pin, (pin) => pinStore.remove([pin]));
              break;
            case RightClickAction.Copy:
              await Clipboard.copy(pin.url);
              await showToast({ title: "Copied to Clipboard" });
              break;
            case RightClickAction.Edit:
              launchCommand({ name: "view-pins", type: LaunchType.UserInitiated, context: { pinID: pin.id } });
              break;
            case RightClickAction.Hide:
              await pinStore.update([{ ...pin, visibility: Visibility.HIDDEN }]);
              break;
            case RightClickAction.Disable:
              await pinStore.update([{ ...pin, visibility: Visibility.DISABLED }]);
              break;
          }
        }
      }}
      alternate={
        <MenuBarExtra.Item
          key={pin.id}
          icon={getPinIcon(pin)}
          title={`Edit '${pin.name || cutoff(pin.url, 20)}'`}
          tooltip={pin.tooltip}
          onAction={async () =>
            launchCommand({ name: "view-pins", type: LaunchType.UserInitiated, context: { pinID: pin.id } })
          }
        />
      }
    />
  );
}
