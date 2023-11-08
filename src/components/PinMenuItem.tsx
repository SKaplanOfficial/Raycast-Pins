import { Clipboard, LaunchType, MenuBarExtra, launchCommand, showToast } from "@raycast/api";
import { getPinIcon } from "../lib/icons";
import { Pin, deletePin, openPin } from "../lib/Pins";
import { ExtensionPreferences, PinsMenubarPreferences } from "../lib/preferences";
import { LocalDataObject } from "../lib/LocalData";

/**
 * A menu item for a pin.
 * @param props.pin The pin to display.
 * @param props.preferences The preferences for the extension.
 * @param props.relevant Whether or not the pin is relevant to the current context.
 * @param props.localData The local data object specifying the current context.
 * @param props.setPins The function to call to update the list of pins.
 * @returns A menu item component.
 */
export default function PinMenuItem(props: {
  pin: Pin;
  preferences: ExtensionPreferences & PinsMenubarPreferences;
  relevant: boolean;
  localData: LocalDataObject;
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>;
}) {
  const { pin, relevant, preferences, localData, setPins } = props;
  return (
    <MenuBarExtra.Item
      key={pin.id}
      icon={getPinIcon(pin)}
      title={pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}
      subtitle={relevant ? "  ✧" : ""}
      shortcut={pin.shortcut}
      onAction={async (event) => {
        if (event.type == "left-click") {
          await openPin(pin, preferences, localData as unknown as { [key: string]: string });
        } else {
          // Handle right-click based on user's preferences
          switch (preferences.rightClickAction) {
            case "open":
              await openPin(pin, preferences, localData as unknown as { [key: string]: string });
              break;
            case "delete":
              await deletePin(pin, setPins);
              break;
            case "copy":
              await Clipboard.copy(pin.url)
              await showToast( { title: "Copied to Clipboard" })
              break;
            case "edit":
              launchCommand({ name: "view-pins", type: LaunchType.UserInitiated, context: { pinID: pin.id }})
              break;
          }
        }
      }}
    />
  );
}
