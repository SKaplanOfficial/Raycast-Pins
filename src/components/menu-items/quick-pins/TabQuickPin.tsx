import { Application, Icon, MenuBarExtra } from "@raycast/api";
import { cutoff } from "../../../lib/utils";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/common";
import { utils } from "placeholders-toolkit";
import { TabRef } from "../../../lib/LocalData";
import { useCachedState } from "@raycast/utils";
import { Group } from "../../../lib/Groups";
import { buildPin } from "../../../lib/pin";
import { useDataStorageContext } from "../../../contexts/DataStorageContext";

type TabQuickPinProps = {
  /**
   * The current application.
   */
  app: Application;

  /**
   * The current tab of a browser.
   */
  tab: TabRef;
};

/**
 * A menu item that creates a new pin whose target URL is the URL of the current browser tab.
 * @returns A menu item, or null if the current application is not a supported browser.
 */
export default function TabQuickPin(props: TabQuickPinProps) {
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
