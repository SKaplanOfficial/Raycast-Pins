/**
 * @file components/PinMenuItem.tsx A menu item for a pin that handles on-click and on-right-click events, as well as de-referencing the pin's icon and shortcut.
 *
 * @summary Menu item for a pin.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-03 10:13:41 
 * Last modified  : 2023-09-03 10:14:42
 */

import { MenuBarExtra } from "@raycast/api";
import { getPinIcon } from "../lib/icons";
import { Pin, deletePin, openPin } from "../lib/Pins";
import { ExtensionPreferences } from "../lib/utils";
import { LocalDataObject } from "../lib/LocalData";

export default function PinMenuItem(props: {
  pin: Pin;
  relevant: boolean;
  preferences: ExtensionPreferences;
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
          await openPin(pin, preferences, localData);
        } else {
          await deletePin(pin, setPins);
        }
      }}
    />
  );
}
