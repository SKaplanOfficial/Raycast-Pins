import { Action, ActionPanel, Color, Form, Icon, showToast, useNavigation } from "@raycast/api";
import { LocalObjectStore, LocalObjectType } from "../hooks/useLocalObjectStore";
import { Tag } from "../lib/tag";
import { getPins } from "../lib/Pins";
import { setStorage } from "../lib/storage";
import { ItemType, StorageKey } from "../lib/constants";
import { useForm } from "@raycast/utils";

type TagFormValues = {
  name: string;
  color: string;
  aliases: string;
  notes: string;
};

type TagFormProps = {
  tag?: LocalObjectType<Tag>;
  tagStore: LocalObjectStore<Tag>;
  onSubmit?: (tag: LocalObjectType<Tag>) => void;
};

export default function TagForm(props: TagFormProps) {
  const { tag, tagStore, onSubmit } = props;
  const { pop } = useNavigation();

  console.log("!!!!!", tag)

  const targetTag = tag ?? {
    name: "",
    color: Color.PrimaryText,
    aliases: [],
    notes: "",
    itemType: ItemType.TAG,
  };

  // console.log("wowza", targetTag);

  const validateName = (name: string | undefined) => {
    if (tagStore.objects.some((tag) => tag.name === name && ("id" in targetTag ? targetTag.id !== tag.id : true))) {
      return "A tag with this name already exists!";
    } else if (!name?.length) {
      return "Name cannot be empty!";
    }
  };

  const { handleSubmit, itemProps, setValidationError } = useForm<TagFormValues>({
    onSubmit: async (values: TagFormValues) => {
      const updatedTag = {
        ...targetTag,
        name: values.name,
        color: values.color,
        aliases: values.aliases.split(",").map((alias) => alias.trim()),
        notes: values.notes,
      };

      if (tag) {
        if (tag.name !== updatedTag.name) {
          const pins = await getPins();
          const updatedPins = pins.map((pin) => ({
            ...pin,
            tags: pin.tags?.map((tag) => (tag === targetTag.name ? updatedTag.name : tag)),
          }));
          await setStorage(StorageKey.LOCAL_PINS, updatedPins);
        }
        await tagStore.update(updatedTag as LocalObjectType<Tag>);
        await showToast({ title: "Tag Updated" });
        onSubmit?.(updatedTag as LocalObjectType<Tag>);
      } else {
        const newTag = await tagStore.add([updatedTag]);
        await showToast({ title: "Tag Created" });
        onSubmit?.(newTag[0]);
      }
      pop();
    },
    initialValues: {
      name: targetTag.name,
      color: targetTag.color ?? Color.PrimaryText,
      aliases: targetTag.aliases.join(","),
      notes: targetTag.notes,
    },
  });

  return (
    <Form
      navigationTitle={tag ? "Edit Tag" : "New Tag"}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.ChevronRight} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        {...itemProps.name}
        onChange={(name) => {
          setValidationError("name", validateName(name));
          itemProps.name.onChange?.(name);
        }}
      />
      <Form.TextField title="Aliases" {...itemProps.aliases} />
      <Form.Dropdown title="Color" info="The color of the tag in list items and accessories." {...itemProps.color}>
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
      <Form.TextArea title="Notes" enableMarkdown {...itemProps.notes} />
    </Form>
  );
}
