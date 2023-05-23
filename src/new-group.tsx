import { useState } from "react";
import { Form, Icon, ActionPanel, Action, popToRoot } from "@raycast/api";
import { iconMap, createNewGroup, useGroups } from "./utils";

const checkNameField = (name: string, setNameError: (error: string | undefined) => void, groupNames: string[]) => {
  // Checks for non-empty (non-spaces-only) name
  if (name.trim().length == 0) {
    setNameError("Name cannot be empty!");
  } else if (groupNames.includes(name)) {
    setNameError("A group with this name already exists!");
  } else {
    setNameError(undefined);
  }
};

const NewGroupForm = () => {
  const [nameError, setNameError] = useState<string | undefined>();
  const [groups] = useGroups();
  const groupNames = groups?.map((group) => group.name);

  const iconList = Object.keys(Icon);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={async (values) => {
              await createNewGroup(values.nameField, values.iconField);
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
        onChange={(value) => checkNameField(value, setNameError, groupNames)}
        onBlur={(event) => checkNameField(event.target.value as string, setNameError, groupNames)}
      />

      <Form.Dropdown id="iconField" title="Group Icon" defaultValue="BulletPoints">
        <Form.Dropdown.Item key="None" title="None" value="None" icon={Icon.Minus} />
        {iconList.map((icon) => {
          return (
            <Form.Dropdown.Item key={icon} title={icon} value={icon} icon={icon in iconMap ? iconMap[icon] : ""} />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
};

export default function Command() {
  return <NewGroupForm />;
}
