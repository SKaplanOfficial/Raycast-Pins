import { useState } from "react";
import { Form, Icon, ActionPanel, Action, popToRoot } from "@raycast/api";
import { checkGroupNameField, checkGroupParentField, createNewGroup, useGroups } from "./lib/Groups";
import { SORT_STRATEGY } from "./lib/constants";
import { iconMap } from "./lib/icons";

/**
 * Form view for creating a new group.
 * @returns A form view.
 */
const NewGroupForm = () => {
  const [nameError, setNameError] = useState<string | undefined>();
  const [parentError, setParentError] = useState<string | undefined>();
  const { groups } = useGroups();
  const groupNames = groups?.map((group) => group.name);

  const iconList = Object.keys(Icon);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={async (values) => {
              await createNewGroup(
                values.nameField,
                values.iconField,
                values.parentField ? values.parentField : undefined,
                values.sortStrategyField ? values.sortStrategyField : "manual"
              );
              await popToRoot();
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
        onChange={(value) => checkGroupNameField(value, setNameError, groupNames)}
        onBlur={(event) => checkGroupNameField(event.target.value as string, setNameError, groupNames)}
      />

      <Form.Dropdown id="iconField" title="Group Icon" defaultValue="BulletPoints">
        <Form.Dropdown.Item key="None" title="None" value="None" icon={Icon.Minus} />
        {iconList.map((icon) => {
          return (
            <Form.Dropdown.Item key={icon} title={icon} value={icon} icon={icon in iconMap ? iconMap[icon] : ""} />
          );
        })}
      </Form.Dropdown>

      <Form.Dropdown
        id="sortStrategyField"
        title="Sort Method"
        defaultValue="manual"
        info="The sorting rule applied to the group. You can manually adjust the order of pins, but you can choose to have them automatically sorted alphabetically, by frequency of usage, by most recent usage, or by date of initial creation."
      >
        {Object.entries(SORT_STRATEGY).map(([key, value]) => {
          return <Form.Dropdown.Item key={key} title={value} value={key} />;
        })}
      </Form.Dropdown>

      <Form.TextField
        id="parentField"
        title="Parent Group"
        placeholder="Parent Group ID"
        defaultValue=""
        info="The ID of this group's parent. You can use this to create multi-layer groupings within the menu bar dropdown menu."
        error={parentError}
        onChange={(value) => checkGroupParentField(value, setParentError, groups)}
        onBlur={(event) => checkGroupParentField(event.target.value as string, setParentError, groups)}
      />
    </Form>
  );
};

export default function Command() {
  return <NewGroupForm />;
}
