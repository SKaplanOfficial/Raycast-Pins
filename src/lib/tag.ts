import { LocalObjectStore, LocalObjectType } from "../hooks/useLocalObjectStore";
import { ItemType } from "./constants";

export type Tag = {
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

  itemType: ItemType.TAG;
};

export async function upgradeTags(
  stringTags: string[],
  tagStore: LocalObjectStore<Tag>,
): Promise<LocalObjectType<Tag>[]> {
  const tagsToCreate: Tag[] = stringTags
    .filter((tagName, index) => !tagStore.objects.some((tag) => tag.name === tagName) && stringTags.indexOf(tagName) === index)
    .map((tagName) => ({
      name: tagName,
      color: "",
      aliases: [],
      notes: "",
      itemType: ItemType.TAG,
    }));
  return tagStore.add(tagsToCreate);
}
