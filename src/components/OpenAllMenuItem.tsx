/**
 * @file components/OpenAllMenuItem.tsx A menu item for opening all pins in a submenu at once.
 *
 * @summary 'Open All' menu item.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-03 09:50:26
 * Last modified  : 2023-09-03 09:56:23
 */

import { getPreferenceValues, MenuBarExtra } from "@raycast/api";

import { openPin, Pin } from "../lib/Pins";
import { ExtensionPreferences } from "../lib/utils";

export default function OpenAllMenuItem(props: { pins: Pin[]; submenuName: string }) {
  const { pins, submenuName } = props;
  const preferences = getPreferenceValues<ExtensionPreferences & { showOpenAll: boolean }>();

  return (
    <MenuBarExtra.Section>
      {preferences.showOpenAll ? (
        <MenuBarExtra.Item
          title={`Open All (${submenuName})`}
          key={`open_all_${submenuName.replaceAll(" ", "_")})}`}
          onAction={async () => {
            for (const pin of pins) {
              await openPin(pin, preferences);
            }
          }}
        />
      ) : null}
    </MenuBarExtra.Section>
  );
}
