import { getPreferenceValues, MenuBarExtra } from "@raycast/api";

import { openPin, Pin } from "../../lib/pin";
import { ExtensionPreferences } from "../../lib/preferences";
import { useDataStorageContext } from "../../contexts/DataStorageContext";

/**
 * A menu item to open all pins in a submenu.
 * @param props.pins The pins to open.
 * @param props.submenuName The name of the submenu.
 * @returns A menu bar extra section component.
 */
export default function OpenAllMenuItem(props: { pins: Pin[]; submenuName: string }) {
  const { pins, submenuName } = props;
  const { pinStore } = useDataStorageContext();
  const preferences = getPreferenceValues<ExtensionPreferences & { showOpenAll: boolean }>();

  return (
    <MenuBarExtra.Section>
      {preferences.showOpenAll ? (
        <MenuBarExtra.Item
          title={`Open All ${submenuName ? `(${submenuName})` : ``}`}
          key={`open_all_${(submenuName || "").replaceAll(" ", "_")})}`}
          onAction={async () => {
            for (const pin of pins) {
              await openPin(
                pin,
                preferences,
                async (pin: Pin) => {
                  await pinStore.update([pin]);
                },
              );
            }
          }}
        />
      ) : null}
    </MenuBarExtra.Section>
  );
}
