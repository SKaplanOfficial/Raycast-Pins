import { useState } from "react";
import { Form, Icon, ActionPanel, Action, popToRoot } from "@raycast/api";
import { getStorage } from "./lib/utils";
import { createNewGroup, useGroups } from "./lib/Groups";
import { SORT_STRATEGY, StorageKey } from "./lib/constants";
import { iconMap } from "./lib/icons";

/**
 * Checks that the name field is not empty and that the name is not already taken.
 * @param name The value of the name field.
 * @param setNameError A function to set the name error.
 * @param groupNames The names of the existing groups.
 */
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
              const nextID = await getStorage(StorageKey.NEXT_GROUP_ID);
              if (values.parentField == nextID.toString()) {
                setParentError("Group cannot be its own parent!");
                return false;
              }
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
        onChange={async (value) => {
          const nextID = await getStorage(StorageKey.NEXT_GROUP_ID);
          if (value != nextID.toString()) {
            setParentError(undefined);
          }
        }}
      />
    </Form>
  );
};

export default function Command() {
  return <NewGroupForm />;
}
