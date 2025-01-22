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
  getGroupStatistics,
  modifyGroup,
} from "../lib/group";
import { useState } from "react";
import { getIcon } from "../lib/utils";
import { SORT_STRATEGY, Visibility } from "../lib/common";
import { GroupDisplaySetting } from "../lib/preferences";
import { useDataStorageContext } from "../contexts/DataStorageContext";
export interface GroupFormValues {
  name: string;
  icon: string;
  iconColor: string;
  visibility: Visibility;
  menubarDisplay: GroupDisplaySetting;
  sortStrategy: string;
  parent: string;
}

/**
 * Form for editing a group.
 * @param props.group The group to edit.
 */
export default function GroupForm(props: { group?: Group; draftValues?: GroupFormValues }) {
  const { group, draftValues } = props;
  const { pinStore, groupStore } = useDataStorageContext();
  const [visibility, setVisibility] = useState<Visibility>(
    draftValues?.visibility || (group?.visibility ?? Visibility.USE_PARENT),
  );
  const [iconColor, setIconColor] = useState<string | undefined>(draftValues?.iconColor || group?.iconColor);
  const [name, setName] = useState<string>(draftValues?.name || group?.name || "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [parentError, setParentError] = useState<string | undefined>();
  const { pop } = useNavigation();

  const targetGroup =
    group ??
    buildGroup({
      name: draftValues?.name || "",
      icon: draftValues?.icon || "BulletPoints",
      parent: draftValues?.parent ? draftValues.parent : undefined,
      sortStrategy: (draftValues?.sortStrategy ||
        SORT_STRATEGY.MANUAL) as (typeof SORT_STRATEGY)[keyof typeof SORT_STRATEGY],
    });

  const parent = group?.parent ? groupStore.objects.find((g) => g.name == group.parent) : undefined;
  const timeSinceCreation = group?.dateCreated ? Date.now() - new Date(group.dateCreated).getTime() : 0;

  return (
    <Form
      enableDrafts={group ? false : true}
      navigationTitle={group ? `Edit Group: ${group.name}` : "New Group"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={async (values) => {
              if (values.parent == targetGroup.name) {
                setParentError("Group cannot be its own parent!");
                return false;
              }

              if (environment.commandName == "new-group") {
                const newGroup = buildGroup(values);
                await groupStore.add([newGroup]);
                await launchCommand({
                  name: "view-groups",
                  type: LaunchType.UserInitiated,
                });
              } else {
                await modifyGroup(targetGroup, values, (group) => groupStore.update([group]), pinStore);
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Group Name"
        error={nameError}
        onChange={(value) => {
          setName(value);
          checkGroupNameField(
            value,
            setNameError,
            groupStore.objects.filter((g) => g.id != targetGroup.id).map((group) => group.name),
          );
        }}
        defaultValue={targetGroup.name}
      />

      <Form.Dropdown id="icon" title="Group Icon" defaultValue={targetGroup.icon}>
        {["None"].concat(Object.keys(Icon)).map((icon) => {
          return <Form.Dropdown.Item key={icon} title={icon} value={icon} icon={getIcon(icon, iconColor)} />;
        })}
      </Form.Dropdown>

      <Form.Dropdown
        id="iconColor"
        title="Icon Color"
        onChange={(value) => setIconColor(value)}
        defaultValue={draftValues?.iconColor || (group?.iconColor ?? Color.PrimaryText)}
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
        id="visibility"
        title="Visibility"
        info="Controls the visibility of the group and its pins"
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
          id="menubarDisplay"
          title="Menubar Display"
          info="How the group is displayed in the menu bar dropdown"
          defaultValue={draftValues?.menubarDisplay || (group?.menubarDisplay ?? GroupDisplaySetting.SUBMENUS)}
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
        id="sortStrategy"
        title="Sort Method"
        defaultValue={targetGroup.sortStrategy || "manual"}
        info="How pins are sorted in the group"
      >
        {targetGroup.sortStrategy ? null : (
          <Form.Dropdown.Item key="none" title="Not Set (Global Preference)" value="none" />
        )}
        {Object.entries(SORT_STRATEGY).map(([key, value]) => {
          return <Form.Dropdown.Item key={key} title={value} value={value} />;
        })}
      </Form.Dropdown>

      <Form.TextField
        id="parent"
        title="Parent Group"
        placeholder="Parent Group ID"
        defaultValue={targetGroup.parent}
        info="The name of this group's parent; use this to create multi-layer groupings within the menu bar dropdown menu"
        error={parentError}
        onChange={async (value) => {
          await checkGroupParentField(value, setParentError, groupStore.objects, name);
        }}
      />

      <Form.TextField
        id="id"
        title="Group ID"
        value={targetGroup.id.toString()}
        info="The ID of this group"
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
