import { Action, ActionPanel, environment, getPreferenceValues, Icon, List, MenuBarExtra, open } from "@raycast/api";

import { cutoff, getIcon } from "../lib/utils";
import { useRecentApps } from "../hooks/useRecentApps";
import { buildPin, openPin, Pin } from "../lib/pin";
import { ExtensionPreferences } from "../lib/preferences";
import OpenAllMenuItem from "./menu-items/OpenAllMenuItem";
import { useDataStorageContext } from "../contexts/DataStorageContext";

/**
 * A list of recent applications as menu bar extra items (default) or list items (in the 'View Pins' command).
 * @param props.pinActions The actions to display for each pin. Only used in list view.
 * @returns A list of menu items or list items.
 */
export default function RecentApplicationsList(props: { pinActions?: JSX.Element }) {
  const { pinActions } = props;
  const { pinStore } = useDataStorageContext();
  const { recentApplications, loadingRecentApplications } = useRecentApps();
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const pseudoPins: Pin[] = recentApplications.map((app) =>
    buildPin({
      name: app.name,
      url: app.path,
      group: "Recent Applications",
    }),
  );

  if (preferences.showRecentApplications && (recentApplications.length > 1 || loadingRecentApplications)) {
    if (environment.commandName == "index") {
      // Show in menu bar
      return (
        <MenuBarExtra.Submenu title="Recent Applications" key="recent_apps" icon={Icon.Clock}>
          {pseudoPins.slice(1).map((pin) => {
            return (
              <MenuBarExtra.Item
                key={pin.url}
                icon={getIcon(pin.url)}
                title={cutoff(pin.name, 20)}
                onAction={async () =>
                  await openPin(pin, preferences, async (pin: Pin) => {
                    await pinStore.update([pin]);
                  })
                }
              />
            );
          })}
          <OpenAllMenuItem pins={pseudoPins} submenuName="Recent Apps" />
        </MenuBarExtra.Submenu>
      );
    }

    // Show in 'view pins' command
    return (
      <List.Section title="Recent Applications">
        {recentApplications.slice(1).map((app) => (
          <List.Item
            title={app.name}
            subtitle="Recent Applications"
            key={app.name}
            icon={{ fileIcon: app.path }}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Pin Actions">
                  <Action title="Open" icon={Icon.ChevronRight} onAction={() => open(app.path)} />
                </ActionPanel.Section>
                {pinActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  }

  return null;
}
