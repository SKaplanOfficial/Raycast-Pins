import { Application, Icon, MenuBarExtra } from "@raycast/api";
import { TabRef } from "../../../lib/LocalData";
import { utils } from "placeholders-toolkit";
import { Group, createNewGroup } from "../../../lib/Groups";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/common";
import { useCachedState } from "@raycast/utils";
import { buildPin } from "../../../lib/pin";
import { useDataStorageContext } from "../../../contexts/DataStorageContext";

type TabsQuickPinProps = {
  /**
   * The current application.
   */
  app: Application;

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
export default function TabsQuickPin(props: TabsQuickPinProps) {
  const { app, tabs, groups } = props;
  const { pinStore } = useDataStorageContext();
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  if (!utils.SupportedBrowsers.find((b) => b.name == app.name) || tabs.length == 0) {
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
          await createNewGroup({
            name: newGroupName,
            icon: "app-window-grid-3x3-16",
          });
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
