import { Action, ActionPanel, Color, Form, Icon, useNavigation } from "@raycast/api";
import { LocalObjectStore, LocalObjectType } from "../hooks/useLocalObjectStore";
import { Tag } from "../lib/tag";
import { useState } from "react";

type TagFormValues = {
  nameField: string;
  colorField: string;
  aliasesField: string;
  notesField: string;
};

type TagFormProps = {
  tag?: LocalObjectType<Tag>;
  tagStore: LocalObjectStore<Tag>;
  onPop?: (tag: LocalObjectType<Tag>) => void;
  draftValues?: TagFormValues;
};

export default function TagForm(props: TagFormProps) {
  const { tag, tagStore, onPop, draftValues } = props;
  const [nameError, setNameError] = useState<string | undefined>();
  const { pop } = useNavigation();

  const targetTag: Tag = tag ?? {
    name: draftValues?.nameField || "",
    color: draftValues?.colorField || Color.PrimaryText,
    aliases: draftValues?.aliasesField ? draftValues.aliasesField.split(",") : [],
    notes: draftValues?.notesField || "",
  };

  return (
    <Form
      enableDrafts
      navigationTitle={tag ? "Edit Tag" : "New Tag"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={async (values) => {
              const updatedTag = {
                ...targetTag,
                name: values.nameField,
                color: values.colorField,
                aliases: (values.aliasesField as string).split(",").map((alias) => alias.trim()),
                notes: values.notesField,
              };

              if (tag) {
                await tagStore.update(updatedTag as LocalObjectType<Tag>);
                onPop?.(updatedTag as LocalObjectType<Tag>);
              } else {
                const newTag = await tagStore.add([updatedTag]);
                onPop?.(newTag[0]);
              }
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Name"
        defaultValue={targetTag.name}
        error={nameError}
        onChange={(newName) => {
          if (newName.length === 0) {
            setNameError("Name cannot be empty!");
          } else {
            setNameError(undefined);
          }
        }}
      />

      <Form.TextField id="aliasesField" title="Aliases" defaultValue={targetTag.aliases.join(",")} />

      <Form.Dropdown
        id="colorField"
        title="Color"
        info="The color of the tag in list items and accessories."
        defaultValue={targetTag.color || Color.PrimaryText}
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

      <Form.TextArea id="notesField" title="Notes" defaultValue={targetTag.notes} enableMarkdown />
    </Form>
  );
}
