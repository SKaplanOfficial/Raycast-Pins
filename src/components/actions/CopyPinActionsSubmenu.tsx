import { Action } from "@raycast/api";
import { Pin, getPinStatistics } from "../../lib/pin";
import { PinAction } from "../../lib/common";
import { useDataStorageContext } from "../../contexts/DataStorageContext";
import CopyActionsSubmenu from "./CopyActionsSubmenu";

/**
 * Submenu for actions to copy pin information to the clipboard.
 * @param props.pin The pin to copy information about.
 */
export default function CopyPinActionsSubmenu(props: { pin: Pin }) {
  const { pin } = props;
  const { pinStore } = useDataStorageContext();

  return (
    <CopyActionsSubmenu item={pin}>
      <Action.CopyToClipboard
        title="Copy Pin Target"
        content={pin.url}
        shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
      />
      <Action.CopyToClipboard
        title="Copy Deeplink"
        content={`raycast://extensions/HelloImSteven/pins/view-pins?context=${encodeURIComponent(
          JSON.stringify({
            pinID: pin.id,
            action: PinAction.OPEN,
          }),
        )}`}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      />
      <Action.CopyToClipboard
        title="Copy Formatted Pin Statistics"
        content={getPinStatistics(pin, pinStore.objects) as string}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      />
      <Action.CopyToClipboard
        title="Copy Pin Statistics as JSON"
        content={JSON.stringify(getPinStatistics(pin, pinStore.objects, "object"))}
        shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "j" }}
      />
    </CopyActionsSubmenu>
  );
}
