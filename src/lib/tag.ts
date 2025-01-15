import { Color } from "@raycast/api";
import { LocalObjectStore, LocalObjectType } from "../hooks/useLocalObjectStore";
import { BaseItem, ItemType } from "./common";

export type Tag = BaseItem & {
  /**
   * The name of the tag. Items will retain this tag even if the name is changed.
   */
  name: string;

  /**
   * The aliases of the tag. Aliases are treated as equal to the name in terms of filtering and searching.
   */
  aliases: string[];

  /**
   * The color of the tag in list items and accessories.
   */
  color: string;

  /**
   * User-defined notes about the tag.
   */
  notes: string;

  dateCreated: string;

  itemType: ItemType.TAG;
};

// TODO: Comment
export function isTag(object: unknown): object is Tag {
  return typeof object === "object" && object !== null && "itemType" in object && object["itemType"] === ItemType.TAG;
}

export function validateTags(tags: Partial<Tag>[]): Tag[] {
  return tags.map(buildTag);
}

// TODO: Comment
export function buildTag(properties?: Partial<Tag>): Tag {
  const data = properties || {};
  return {
    name: data.name || "New Tag",
    aliases: data.aliases || [],
    color: data.color || Color.PrimaryText,
    notes: data.notes || "",
    dateCreated: data.dateCreated || new Date().toISOString(),
    id: data.id || "",
    itemType: ItemType.TAG,
  };
}

export async function upgradeTags(
  stringTags: string[],
  tagStore: LocalObjectStore<Tag>,
): Promise<LocalObjectType<Tag>[]> {
  const tagsToCreate: Tag[] = stringTags
    .filter(
      (tagName, index) =>
        !tagStore.objects.some((tag) => tag.name === tagName) && stringTags.indexOf(tagName) === index,
    )
    .map((tagName) => buildTag({ name: tagName }));
  return tagStore.add(tagsToCreate);
}
