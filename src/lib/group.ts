import { storageMethods } from "./storage";
import { BaseItem, ItemType, SORT_FN, SORT_STRATEGY, storageKeys, Visibility } from "./common";
import { Color, environment, showToast } from "@raycast/api";
import { Pin, sortPins } from "./pin";
import { GroupDisplaySetting } from "./preferences";
import { getStoredObjects, LocalObjectStore } from "../hooks/useLocalObjectStore";

/**
 * A group of pins.
 */
export type Group = BaseItem & {
  /**
   * A reference to the icon for the group, either a valid Raycast icon, a URL, a file path, or an empty icon placeholder.
   */
  icon: string;

  /**
   * The name of the parent group.
   */
  parent?: string;

  /**
   * The method used to sort the group's pins.
   */
  sortStrategy: (typeof SORT_STRATEGY)[keyof typeof SORT_STRATEGY];

  /**
   * The color to tint the icon.
   */
  iconColor: string;

  /**
   * The date the group was created.
   */
  dateCreated: string;

  /**
   * Where the group is visible, if at all.
   */
  visibility: Visibility;

  /**
   * How the group should be displayed in the menubar.
   */
  menubarDisplay: GroupDisplaySetting;

  tags: string[];

  itemType: ItemType.GROUP;
};

/**
 * The keys of an {@link Group} object.
 */
export const GroupKeys = [
  "name",
  "icon",
  "id",
  "parent",
  "sortStrategy",
  "iconColor",
  "dateCreated",
  "visibility",
  "menubarDisplay",
  "tags",
  "itemType",
] as const;

/**
 * Checks if an object is a group.
 * @param obj The item to check.
 */
export const isGroup = (object: unknown): object is Group => {
  return typeof object === "object" && object !== null && "itemType" in object && object["itemType"] === ItemType.GROUP;
};

/**
 * Gets the stored groups.
 * @returns The list of groups.
 */
export const getGroups = async () => {
  return await getStoredObjects<Group>(storageKeys.groupStore, storageMethods, validateGroups);
};

/**
 * Gets the ancestors of a group.
 * @param group The group to get the ancestors of.
 * @param allGroups The list of all groups.
 * @returns An array of ancestor groups of the group.
 */
export const getAncestorsOfGroup = (group: Group, allGroups: Group[], options?: { excluding: Group[] }): Group[] => {
  const ancestors: Group[] = [];
  let currentGroup = group;
  while (currentGroup.parent != undefined) {
    const parent = allGroups.find(
      (g) => g.name == currentGroup.parent && !options?.excluding.some((eg) => eg.id == g.id),
    );
    if (parent) {
      ancestors.push(parent);
      currentGroup = parent;
    } else {
      break;
    }
  }
  return ancestors;
};

/**
 * Checks if a group should be displayed in the current context.
 * @param group The group to check.
 * @param allGroups The list of all groups.
 * @returns True if the group should be displayed, false otherwise.
 */
export const shouldDisplayGroup = (group: Group, allGroups: Group[]): boolean => {
  const visibilityChecks = {
    [Visibility.USE_PARENT]: () => {
      const parent = allGroups.find((g) => g.name == group.parent);
      return parent ? shouldDisplayGroup(parent, allGroups) : true;
    },
    [Visibility.VISIBLE]: () => true,
    [Visibility.HIDDEN]: () => false,
    [Visibility.DISABLED]: () => false,
    [Visibility.VIEW_PINS_ONLY]: () => environment.commandName == "view-pins",
    [Visibility.MENUBAR_ONLY]: () => environment.commandName == "index",
  };
  return visibilityChecks[group.visibility || Visibility.USE_PARENT]();
};

/**
 * Validates a list of groups, ensuring that they all have valid IDs.
 * @param groups The list of groups to validate.
 * @returns The list of validated groups.
 */
export const validateGroups = (groups: Group[]) => {
  return groups.map(buildGroup);
};

// TODO: This comment
/**
 * Creates a dummy group object.
 * @returns The group object with placeholder values.
 */
export const buildGroup = (properties?: Partial<Group>): Group => {
  const data = properties || {};
  return {
    name: data.name || "New Group",
    icon: data.icon || "Minus",
    id: data.id || "",
    parent: data.parent,
    sortStrategy: data.sortStrategy
      ? data.sortStrategy in SORT_STRATEGY
        ? SORT_STRATEGY[data.sortStrategy as keyof typeof SORT_STRATEGY]
        : data.sortStrategy
      : SORT_STRATEGY.MANUAL,
    iconColor: data.iconColor || Color.PrimaryText,
    dateCreated: data.dateCreated || new Date().toISOString(),
    visibility: data.visibility || Visibility.USE_PARENT,
    menubarDisplay: data.menubarDisplay || GroupDisplaySetting.SUBMENUS,
    tags: data.tags || [],
    itemType: ItemType.GROUP,
  };
};

/**
 * Modifies the properties of a group.
 * @param group The group to modify (used to source the group's ID)
 * @param attributes The new attributes for the group.
 * @param updateGroup The function to update the group.
 * @param pinStore The store of pins.
 */
export const modifyGroup = async (
  group: Group,
  attributes: Partial<Group>,
  updateGroup: (group: Group) => Promise<void>,
  pinStore: LocalObjectStore<Pin>,
) => {
  await updateGroup({
    ...group,
    ...attributes,
  });

  // Propagate changes to pins
  const storedPins = pinStore.objects;
  const newPins = storedPins.map((pin: Pin) => {
    return {
      ...pin,
      group: pin.group == group.name ? attributes.name || group.name : pin.group,
    };
  });
  await pinStore.update(newPins);
  await showToast({ title: `Updated pin group!` });
};

/**
 * Deletes a group from local storage.
 * @param group The group to delete.
 * @param setGroups The function to update the active list of groups.
 */
export const deleteGroup = async (
  group: Group,
  groupStore: LocalObjectStore<Group>,
  pinStore: LocalObjectStore<Pin>,
  displayToast = true,
) => {
  const updatedGroups = groupStore.objects
    .map((g) => {
      if (g.parent == group.name) {
        g.parent = groupStore.objects.find((g) => g.name == group.parent)?.name;
      }
      return g;
    })
    .filter((g) => g.id != group.id);
  await groupStore.remove([group]);
  await groupStore.update(updatedGroups);

  const isDuplicate = updatedGroups.some((g) => g.name == group.name);
  const updatedPins = pinStore.objects.map((pin: Pin) => {
    if (pin.group == group.name && !isDuplicate) {
      pin.group = updatedGroups.find((g) => g.name == group.parent)?.name || "None";
    }
    return pin;
  });
  await pinStore.update(updatedPins);
  if (displayToast) await showToast({ title: `Removed pin group!` });
};

/**
 * Checks that the name field is not empty and that the name is not already taken.
 * @param name The value of the name field.
 * @param setNameError A function to set the name error.
 * @param groupNames The names of the existing groups.
 */
export const checkGroupNameField = (
  name: string,
  setNameError: (error: string | undefined) => void,
  groupNames: string[],
) => {
  if (name.trim().length == 0) {
    setNameError("Name cannot be empty!");
  } else if (groupNames.includes(name)) {
    setNameError("A group with this name already exists!");
  } else {
    setNameError(undefined);
  }
};

/**
 * Checks that the entered parent name is valid (i.e. a group with that name exists, and the group is not the one currently being created).
 * @param suggestedName The value of the parent's name field.
 * @param setParentError A function to set the parent error.
 */
export const checkGroupParentField = async (
  suggestedName: string,
  setParentError: React.Dispatch<React.SetStateAction<string | undefined>>,
  groups: Group[],
  groupName: string,
): Promise<boolean> => {
  if (suggestedName.trim().length == 0) {
    setParentError(undefined);
    return true;
  } else if (!groups.map((g) => g.name).includes(suggestedName)) {
    setParentError("No group with this ID exists!");
    return false;
  } else if (suggestedName == groupName) {
    setParentError("Group cannot be its own parent!");
    return false;
  } else {
    setParentError(undefined);
    return true;
  }
};

/**
 * Gets the list of pins in a given group. If `recursive` is true, then the list of pins will include the pins of the subgroups, and so on.
 * @param group The group to get the pins of.
 * @param groups The list of all groups.
 * @param pins The list of all pins.
 * @param recursive Whether or not to recursively search for pins.
 */
export const getMemberPins = (group: Group, groups: Group[], pins: Pin[], recursive = false) => {
  const memberPins: Pin[] = [];
  for (const pin of pins) {
    if (pin.group == group.name || (recursive && getSubgroups(group, groups, true).some((g) => g.name == pin.group))) {
      memberPins.push(pin);
    }
  }
  return memberPins;
};

/**
 * Gets the list of subgroups of a given group, optionally including subgroups of subgroups, and so on.
 * @param group The group to get the subgroups of.
 * @param groups The list of all groups.
 * @param recursive Whether or not to recursively search for subgroups.
 */
export const getSubgroups = (group: Group, groups: Group[], recursive = false) => {
  const subgroups: Group[] = [];
  for (const g of groups) {
    if (recursive && g.parent == group.name) {
      subgroups.push(g, ...getSubgroups(g, groups));
    } else if (g.parent == group.name) {
      subgroups.push(g);
    }
  }
  return subgroups;
};

/**
 * Gets the statistics for a given group as either a string (default) or an object.
 * @param group The group to get statistics for.
 * @param groups The list of all groups.
 * @param pins The list of all pins.
 * @param format The format to return the statistics in. Defaults to "string".
 */
export const getGroupStatistics = (
  group: Group,
  groups: Group[],
  pins: Pin[],
  format: "string" | "object" = "string",
) => {
  const dateFormat: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  };

  const formattedDateCreated = group.dateCreated
    ? new Date(group.dateCreated).toLocaleDateString(undefined, dateFormat)
    : new Date().toLocaleDateString(undefined, dateFormat);

  const subgroups = getSubgroups(group, groups, true);
  const memberPins = getMemberPins(group, groups, pins);
  const allMemberPins = getMemberPins(group, groups, pins, true);

  const mostUsedPin = sortPins(allMemberPins, groups, undefined, SORT_FN.MOST_FREQUENT)[0];
  const leastUsedPin = sortPins(allMemberPins, groups, undefined, SORT_FN.LEAST_FREQUENT)[0];

  if (format == "object") {
    return {
      dateCreated: formattedDateCreated,
      topLevelPins: memberPins.length,
      totalPins: allMemberPins.length,
      totalSubgroups: subgroups.length,
      mostUsedPin: `${
        mostUsedPin?.timesOpened
          ? `${mostUsedPin.name} (${mostUsedPin.timesOpened} time${mostUsedPin.timesOpened == 1 ? "" : "s"})`
          : "N/A"
      }`,
      leastUsedPin: `${
        leastUsedPin?.timesOpened
          ? `${leastUsedPin.name} (${leastUsedPin.timesOpened} time${leastUsedPin.timesOpened == 1 ? "" : "s"})`
          : "N/A"
      }`,
    };
  }

  const dateCreatedText = `Date Created: ${formattedDateCreated}`;
  const topLevelPinsText = `# of Top-Level Pins: ${memberPins.length}`;
  const totalPinsText = `Total # of Pins: ${allMemberPins.length}`;
  const totalSubgroupsText = `Total # of Subgroups: ${subgroups.length}`;

  const mostUsedPinText = `Most Used Pin: ${
    mostUsedPin?.timesOpened
      ? `${mostUsedPin.name} (${mostUsedPin.timesOpened} time${mostUsedPin.timesOpened == 1 ? "" : "s"})`
      : "N/A"
  }`;
  const leastUsedPinText = `Least Used Pin: ${
    leastUsedPin?.timesOpened
      ? `${leastUsedPin.name} (${leastUsedPin.timesOpened} time${leastUsedPin.timesOpened == 1 ? "" : "s"})`
      : "N/A"
  }`;

  return [dateCreatedText, topLevelPinsText, totalPinsText, totalSubgroupsText, mostUsedPinText, leastUsedPinText].join(
    "\n\n",
  );
};
