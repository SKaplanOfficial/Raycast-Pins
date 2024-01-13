import { Application, Icon, MenuBarExtra } from "@raycast/api";
import { cutoff } from "../../../lib/utils";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/constants";
import { utils } from "placeholders-toolkit";
import { TabRef } from "../../../lib/LocalData";
import { createNewPin } from "../../../lib/Pins";
import { useCachedState } from "@raycast/utils";
import { Group } from "../../../lib/Groups";

type TabQuickPinProps = {
  app: Application;
  tab: TabRef;
};

export default function TabQuickPin(props: TabQuickPinProps) {
  const { app, tab } = props;
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  if (!utils.SupportedBrowsers.find((b) => b.name == app.name)) {
    return null;
  }
  
  let title = `Pin This Tab (${cutoff(tab.name, 20)})`
  if (targetGroup) {
    title = `${title} to Target Group`
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={Icon.AppWindow}
      tooltip="Add a pin whose target URL is the URL of the current browser tab"
      shortcut={KEYBOARD_SHORTCUT.PIN_CURRENT_TAB}
      onAction={async () => {
        await createNewPin(
          tab.name,
          tab.url,
          "Favicon / File Icon",
          targetGroup?.name || "None",
          app.name,
          undefined,
          undefined,
          false,
          undefined,
          undefined,
          [],
          "",
        );
      }}
    />
  );
}
