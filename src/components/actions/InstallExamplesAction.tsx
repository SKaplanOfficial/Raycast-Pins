import { Action, Icon, confirmAlert, showToast } from "@raycast/api";
import { installExamples } from "../../lib/defaults";
import { useDataStorageContext } from "../../contexts/DataStorageContext";
import { ItemType } from "../../lib/common";

/**
 * Action to install example pins.
 * @param props.setExamplesInstalled The function to set the examples installed state.
 * @param props.kind The kind of examples to install (pins or groups).
 * @returns An action component.
 */
export const InstallExamplesAction = (props: {
  kind: ItemType;
  onInstall?: () => void;
}) => {
  const { kind, onInstall } = props;
  const { pinStore, groupStore, tagStore } = useDataStorageContext();
  const kindLabel = kind ==ItemType.PIN ? "Pins" : "Groups";
  return (
    <Action
      title={`Install Example ${kindLabel}`}
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={async () => {
        if (
          await confirmAlert({
            title: `Install Example ${kindLabel}?`,
            message:
              kind == ItemType.PIN
                ? "This will install example pins and any groups they belong to. This wil NOT overwrite any existing pins or groups."
                : "This will install several example groups to get you started. No pins will be installed. This wil NOT overwrite any existing groups.",
            primaryAction: { title: "Install" },
          })
        ) {
          await installExamples(kind);
          await pinStore.load();
          await groupStore.load();
          await tagStore.load();
          onInstall?.();
          await showToast({ title: `Installed Example ${kindLabel}` });
        }
      }}
    />
  );
};
