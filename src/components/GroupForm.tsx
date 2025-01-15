import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  LaunchType,
  environment,
  launchCommand,
  useNavigation,
} from "@raycast/api";
import {
  Group,
  buildGroup,
  checkGroupNameField,
  checkGroupParentField,
  createNewGroup,
  getGroupStatistics,
  modifyGroup,
} from "../lib/Groups";
import { useState } from "react";
import { getIcon } from "../lib/icons";
import { SORT_STRATEGY, Visibility } from "../lib/common";
import { GroupDisplaySetting } from "../lib/preferences";
import { useDataStorageContext } from "../contexts/DataStorageContext";
export interface GroupFormValues {
  nameField: string;
  iconField: string;
  iconColorField: string;
  visibilityField: Visibility;
  menubarDisplayField: GroupDisplaySetting;
  sortStrategyField: string;
  parentField: string;
}

/**
 * Form for editing a group.
 * @param props.group The group to edit.
 * @returns A form view.
 */
export default function GroupForm(props: { group?: Group; draftValues?: GroupFormValues }) {
  const { group, draftValues } = props;
  const { pinStore, groupStore } = useDataStorageContext();
  const [visibility, setVisibility] = useState<Visibility>(
    draftValues?.visibilityField || (group?.visibility ?? Visibility.USE_PARENT),
  );
  const [iconColor, setIconColor] = useState<string | undefined>(draftValues?.iconColorField || group?.iconColor);
  const [nameError, setNameError] = useState<string | undefined>();
  const [parentID, setParentID] = useState<string | undefined>(
    draftValues?.parentField ? draftValues.parentField : group?.parent,
  );
  const [parentError, setParentError] = useState<string | undefined>();
  const { pop } = useNavigation();

  // No group data provided -> we're creating a new group.
  const targetGroup =
    group == undefined
      ? buildGroup({
          name: draftValues?.nameField || "",
          icon: draftValues?.iconField || "BulletPoints",
          parent: draftValues?.parentField ? draftValues.parentField : undefined,
          sortStrategy: (draftValues?.sortStrategyField ||
            SORT_STRATEGY.MANUAL) as (typeof SORT_STRATEGY)[keyof typeof SORT_STRATEGY],
        })
      : group;

  const parent = group?.parent ? groupStore.objects.find((g) => g.id == group.parent) : undefined;
  const timeSinceCreation = group?.dateCreated ? Date.now() - new Date(group.dateCreated).getTime() : 0;

  return (
    <Form
      enableDrafts
      navigationTitle={group ? `Edit Group: ${group.name}` : "New Group"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={async (values) => {
              if (values.parentField == targetGroup.id.toString()) {
                setParentError("Group cannot be its own parent!");
                return false;
              }
              if (environment.commandName == "new-group") {
                await createNewGroup({
                  name: values.nameField,
                  icon: values.iconField,
                  parent: values.parentField ? values.parentField : undefined,
                  sortStrategy:
                    values.sortStrategyField && values.sortStrategyField != "none"
                      ? values.sortStrategyField
                      : undefined,
                  iconColor: values.iconColorField,
                  visibility: values.visibilityField,
                  menubarDisplay: values.menubarDisplayField,
                });
                await launchCommand({
                  name: "view-groups",
                  type: LaunchType.UserInitiated,
                });
              } else {
                await modifyGroup(
                  targetGroup,
                  {
                    name: values.nameField,
                    icon: values.iconField,
                    parent: values.parentField ? values.parentField : undefined,
                    sortStrategy:
                      values.sortStrategyField && values.sortStrategyField != "none"
                        ? values.sortStrategyField
                        : undefined,
                    iconColor: values.iconColorField,
                    visibility: values.visibilityField,
                    menubarDisplay: values.menubarDisplayField,
                  },
                  (group) => groupStore.update([group]),
                  pinStore,
                );
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Group Name"
        placeholder="Enter the group name"
        error={nameError}
        onChange={(value) =>
          checkGroupNameField(
            value,
            setNameError,
            groupStore.objects.filter((g) => g.id != targetGroup.id).map((group) => group.name),
          )
        }
        onBlur={(event) =>
          checkGroupNameField(
            event.target.value as string,
            setNameError,
            groupStore.objects.filter((g) => g.id != targetGroup.id).map((group) => group.name),
          )
        }
        defaultValue={targetGroup.name}
      />

      <Form.Dropdown id="iconField" title="Group Icon" defaultValue={targetGroup.icon}>
        {["None"].concat(Object.keys(Icon)).map((icon) => {
          return <Form.Dropdown.Item key={icon} title={icon} value={icon} icon={getIcon(icon, iconColor)} />;
        })}
      </Form.Dropdown>

      <Form.Dropdown
        id="iconColorField"
        title="Icon Color"
        onChange={(value) => setIconColor(value)}
        defaultValue={draftValues?.iconColorField || (group?.iconColor ?? Color.PrimaryText)}
      >
        {Object.entries(Color).map(([key, color]) => {
          return (
            <Form.Dropdown.Item
              key={key}
              title={key}
              value={color.toString()}
              icon={{ source: Icon.Circle, tintColor: color }}
            />
          );
        })}
      </Form.Dropdown>

      <Form.Dropdown
        id="visibilityField"
        title="Visibility"
        info="Controls the visibility of the group and its pins in the 'View Pins' command and the menu bar dropdown."
        value={visibility}
        onChange={(value) => {
          setVisibility(value as Visibility);
        }}
      >
        <Form.Dropdown.Item
          key="use_hidden"
          title="Use Parent Setting"
          value={Visibility.USE_PARENT}
          icon={Icon.Gear}
        />
        <Form.Dropdown.Item key="visible" title="Visible" value={Visibility.VISIBLE} icon={Icon.Eye} />
        <Form.Dropdown.Item
          key="menubarOnly"
          title="Show in Menubar Only"
          value={Visibility.MENUBAR_ONLY}
          icon={Icon.Window}
        />
        <Form.Dropdown.Item
          key="raycastOnly"
          title="Show in 'View Pins' Only"
          value={Visibility.VIEW_PINS_ONLY}
          icon={Icon.AppWindowList}
        />
        <Form.Dropdown.Item key="hidden" title="Hidden" value={Visibility.HIDDEN} icon={Icon.EyeDisabled} />
      </Form.Dropdown>

      {visibility === Visibility.VISIBLE ||
      visibility === Visibility.MENUBAR_ONLY ||
      visibility === undefined ||
      (visibility === Visibility.USE_PARENT &&
        parent?.visibility !== Visibility.DISABLED &&
        parent?.visibility !== Visibility.HIDDEN &&
        parent?.visibility !== Visibility.VIEW_PINS_ONLY) ? (
        <Form.Dropdown
          id="menubarDisplayField"
          title="Menubar Display"
          info="Controls how the group is displayed in the menu bar dropdown."
          defaultValue={draftValues?.menubarDisplayField || (group?.menubarDisplay ?? GroupDisplaySetting.SUBMENUS)}
        >
          <Form.Dropdown.Item
            key="useParent"
            title="Use Parent Setting"
            value={GroupDisplaySetting.USE_PARENT}
            icon={Icon.Gear}
          />
          <Form.Dropdown.Item key="submenus" title="Submenu" value={GroupDisplaySetting.SUBMENUS} icon={Icon.Layers} />
          <Form.Dropdown.Item
            key="subsections"
            title="Subsection"
            value={GroupDisplaySetting.SUBSECTIONS}
            icon={Icon.List}
          />
          <Form.Dropdown.Item
            key="items"
            title="Clickable Item"
            value={GroupDisplaySetting.ITEMS}
            icon={Icon.StackedBars4}
          />
        </Form.Dropdown>
      ) : null}

      <Form.Dropdown
        id="sortStrategyField"
        title="Sort Method"
        defaultValue={targetGroup.sortStrategy || "manual"}
        info="The sorting rule applied to the group. You can manually adjust the order of pins, but you can choose to have them automatically sorted alphabetically, by frequency of usage, by most recent usage, or by initial creation date."
      >
        {targetGroup.sortStrategy ? null : (
          <Form.Dropdown.Item key="none" title="Not Set (Global Preference)" value="none" />
        )}
        {Object.entries(SORT_STRATEGY).map(([key, value]) => {
          return <Form.Dropdown.Item key={key} title={value} value={value} />;
        })}
      </Form.Dropdown>

      <Form.TextField
        id="parentField"
        title="Parent Group"
        placeholder="Parent Group ID"
        value={parentID || ""}
        info="The ID of this group's parent. You can use this to create multi-layer groupings within the menu bar dropdown menu."
        error={parentError}
        onChange={async (value) => {
          const isValid = await checkGroupParentField(value, setParentError, groupStore.objects);
          if (isValid) {
            setParentID(value);
          }
        }}
        onBlur={(event) => checkGroupParentField(event.target.value as string, setParentError, groupStore.objects)}
      />

      <Form.TextField
        id="idField"
        title="Group ID"
        value={targetGroup.id.toString()}
        info="The ID of this group. You can use this to specify this group as a parent of other groups."
        onChange={() => null}
      />

      {group && timeSinceCreation > 5000 ? (
        <>
          <Form.Separator />
          <Form.Description
            title="Statistics"
            text={getGroupStatistics(group, groupStore.objects, pinStore.objects) as string}
          />
        </>
      ) : null}
    </Form>
  );
}
