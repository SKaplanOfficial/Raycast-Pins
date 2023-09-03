import { useState } from "react";
import { Icon, Form, List, useNavigation, Action, ActionPanel, confirmAlert, Alert } from "@raycast/api";
import { setStorage, getStorage } from "./lib/utils";
import { SORT_STRATEGY, StorageKey } from "./lib/constants";
import { Group, deleteGroup, modifyGroup, useGroups } from "./lib/Groups";
import { Pin, usePins } from "./lib/Pins";
import { addSortingStrategyAccessory } from "./lib/accessories";
import { getGroupIcon, getIcon } from "./lib/icons";

/**
 * Form view for editing a group.
 * @param props.group The group to edit.
 * @param props.setGroups The function to call to update the list of groups.
 * @returns A form view.
 */
const EditGroupView = (props: { group: Group; setGroups: (groups: Group[]) => void }) => {
  const group = props.group;
  const setGroups = props.setGroups;
  const [nameError, setNameError] = useState<string | undefined>();
  const [parentError, setParentError] = useState<string | undefined>();
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={(values) => {
              if (values.parentField == group.id.toString()) {
                setParentError("Group cannot be its own parent!");
                return false;
              }
              modifyGroup(
                group,
                values.nameField,
                values.iconField,
                pop,
                setGroups,
                values.parentField ? values.parentField : undefined,
                values.sortStrategyField ? values.sortStrategyField : "manual"
              );
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
        onChange={() => (nameError !== undefined ? setNameError(undefined) : null)}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("Name cannot be empty!");
          } else if (nameError !== undefined) {
            setNameError(undefined);
          }
        }}
        defaultValue={group.name}
      />

      <Form.Dropdown id="iconField" title="Group Icon" defaultValue={group.icon}>
        {["None"].concat(Object.keys(Icon)).map((icon) => {
          return (
            <Form.Dropdown.Item
              key={icon}
              title={icon}
              value={icon}
              icon={getIcon(icon)}
            />
          );
        })}
      </Form.Dropdown>

      <Form.Dropdown
        id="sortStrategyField"
        title="Sort Method"
        defaultValue={group.sortStrategy || "manual"}
        info="The sorting rule applied to the group. You can manually adjust the order of pins, but you can choose to have them automatically sorted alphabetically, by frequency of usage, by most recent usage, or by initial creation date."
      >
        {Object.entries(SORT_STRATEGY).map(([key, value]) => {
          return <Form.Dropdown.Item key={key} title={value} value={key} />;
        })}
      </Form.Dropdown>

      <Form.TextField
        id="parentField"
        title="Parent Group"
        placeholder="Parent Group ID"
        defaultValue={(group.parent || "").toString()}
        info="The ID of this group's parent. You can use this to create multi-layer groupings within the menu bar dropdown menu."
        error={parentError}
        onChange={(value) => {
          if (value != group.id.toString()) {
            setParentError(undefined);
          }
        }}
      />

      <Form.TextField
        id="idField"
        title="Group ID"
        value={group.id.toString()}
        info="The ID of this group. You can use this to specify this group as a parent of other groups."
        onChange={() => null}
      />
    </Form>
  );
};

/**
 * Action to create a new group. Opens a form view with blank/default fields.
 * @param props.setGroups The function to call to update the list of groups.
 * @returns An action component.
 */
const CreateNewGroupAction = (props: { setGroups: (groups: Group[]) => void }) => {
  const { setGroups } = props;
  return (
    <Action.Push
      title="Create New Group"
      icon={Icon.PlusCircle}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={
        <EditGroupView
          group={{
            name: "",
            icon: "None",
            id: -1,
            parent: undefined,
          }}
          setGroups={setGroups}
        />
      }
    />
  );
};

/**
 * Moves a group up in the list of groups.
 * @param index The current index of the group.
 * @param setGroups The function to call to update the list of groups.
 */
const moveGroupUp = async (index: number, setGroups: React.Dispatch<React.SetStateAction<Group[]>>) => {
  const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
  if (storedGroups.length > index) {
    [storedGroups[index - 1], storedGroups[index]] = [storedGroups[index], storedGroups[index - 1]];
    setGroups(storedGroups);
    await setStorage(StorageKey.LOCAL_GROUPS, storedGroups);
  }
};

/**
 * Moves a group down in the list of groups.
 * @param index The current index of the group.
 * @param setGroups The function to call to update the list of groups.
 */
const moveGroupDown = async (index: number, setGroups: React.Dispatch<React.SetStateAction<Group[]>>) => {
  const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
  if (storedGroups.length > index + 1) {
    [storedGroups[index], storedGroups[index + 1]] = [storedGroups[index + 1], storedGroups[index]];
    setGroups(storedGroups);
    await setStorage(StorageKey.LOCAL_GROUPS, storedGroups);
  }
};

export default function Command() {
  const { groups, setGroups } = useGroups();
  const { pins } = usePins();
  const { push } = useNavigation();

  return (
    <List
      isLoading={groups === undefined}
      searchBarPlaceholder="Search groups..."
      actions={
        <ActionPanel>
          <CreateNewGroupAction setGroups={setGroups as (groups: Group[]) => void} />
        </ActionPanel>
      }
    >
      <List.EmptyView title="No Groups Found" icon="no-view.png" />
      {((groups as Group[]) || []).map((group, index) => {
        const groupPins = pins.filter((pin: Pin) => pin.group == group.name);

        const accessories: List.Item.Accessory[] = [];
        addSortingStrategyAccessory(group, accessories);

        return (
          <List.Item
            title={group.name}
            subtitle={`${groupPins.length} pin${groupPins.length == 1 ? "" : "s"}`}
            accessories={accessories}
            key={group.id}
            icon={getGroupIcon(group)}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Group Actions">
                  <Action
                    title="Edit"
                    icon={Icon.Pencil}
                    onAction={() =>
                      push(<EditGroupView group={group} setGroups={setGroups as (groups: Group[]) => void} />)
                    }
                  />

                  <Action.CopyToClipboard
                    title="Copy Group Name"
                    content={group.name}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Group ID"
                    content={group.id.toString()}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                  />

                  <Action
                    title="Delete Group"
                    icon={Icon.Trash}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Group (Keep Pins)",
                          message: "Are you sure?",
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        await deleteGroup(group, setGroups as (groups: Group[]) => void);
                      }
                    }}
                    style={Action.Style.Destructive}
                  />
                  <Action
                    title="Delete Group And Pins"
                    icon={Icon.Trash}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Group And Pins",
                          message: "Are you sure?",
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        const storedPins = await getStorage(StorageKey.LOCAL_PINS);
                        const updatedPins = storedPins.filter((pin: Pin) => {
                          return pin.group != group.name;
                        });
                        await setStorage(StorageKey.LOCAL_PINS, updatedPins);
                        await deleteGroup(group, setGroups as (groups: Group[]) => void);
                      }
                    }}
                    style={Action.Style.Destructive}
                  />

                  {index > 0 ? (
                    <Action
                      title="Move Up"
                      icon={Icon.ArrowUp}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                      onAction={async () => {
                        await moveGroupUp(index, setGroups);
                      }}
                    />
                  ) : null}
                  {index < groups.length - 1 ? (
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      onAction={async () => {
                        await moveGroupDown(index, setGroups);
                      }}
                    />
                  ) : null}
                </ActionPanel.Section>
                <CreateNewGroupAction setGroups={setGroups as (groups: Group[]) => void} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
