import { Keyboard } from '@raycast/api';

export enum ItemType {
  PIN = "pin",
  GROUP = "group",
  TAG = "tag",
}

export type BaseItem = {
  id: string;
  name: string;
  dateCreated: string;

  /**
   * T
   */
  itemType: ItemType;
}

/**
 * Storage keys used throughout the extension.
 */
export const storageKeys = {
  oldPinList: "local-pins",
  oldGroupList: "local-groups",
  pinStore: "local-pin-store",
  groupStore: "local-group-store",
  tagStore: "local-tag-store",
  appData: "local-app-data",

  /**
   * The cached list of recently used applications.
   */
  recentApps: "local-recent-apps",

  /**
   * The current group to add new pins to by default.
   */
  targetGroup: "target-group",

  /**
   * Indicates whether user has installed the example pins.
   */
  examplePinsInstalled: "example-pins-installed",

  /**
   * Indicates whether user has installed the example groups.
   */
  exampleGroupsInstalled: "example-groups-installed",

  /**
   * The ID of the last opened pin.
   */
  lastOpenedPin: "last-opened-pin",

  /**
   * The list of delayed executions.
   */
  delayedExecutions: "delayed-executions",
} as const;

/**
 * Reserved shortcuts used throughout the extension.
 */
export const KEYBOARD_SHORTCUT: { [key: string]: Keyboard.Shortcut } = {
  PIN_CURRENT_APP: { modifiers: ["cmd", "shift"], key: "a" },
  PIN_CURRENT_DIRECTORY: { modifiers: ["cmd", "shift"], key: "d" },
  PIN_CURRENT_TAB: { modifiers: ["cmd", "shift"], key: "t" },
  PIN_ALL_TABS: { modifiers: ["cmd", "shift"], key: "g" },
  PIN_SELECTED_TEXT: { modifiers: ["cmd", "shift"], key: "s" },
  PIN_SELECTED_FILES: { modifiers: ["cmd", "shift"], key: "f" },
  PIN_CURRENT_DOCUMENT: { modifiers: ["cmd", "shift"], key: "e" },
  PIN_SELECTED_NOTES: { modifiers: ["cmd", "shift"], key: "n" },
  PIN_CURRENT_TRACK: { modifiers: ["cmd", "opt"], key: "t" },
  PIN_CURRENT_PLAYLIST: { modifiers: ["cmd", "opt"], key: "p" },

  CREATE_NEW_PIN: { modifiers: ["cmd"], key: "n" },
  COPY_PINS_JSON: { modifiers: ["cmd"], key: "j" },
  OPEN_PLACEHOLDERS_GUIDE: { modifiers: ["cmd"], key: "g" },
  OPEN_PREFERENCES: { modifiers: ["cmd"], key: "," },
} as const;

/**
 * Sorting strategies and their display names.
 */
export const SORT_STRATEGY = {
  ALPHABETICAL: "Alphabetical",
  DATE_CREATED: "Creation Date",
  FREQUENCY: "Frequency",
  MANUAL: "Manual",
  RECENCY: "Recency",
} as const;

/**
 * Basic sorting functions.
 */
export const SORT_FN: { [key: string]: (a: unknown, b: unknown) => number } = {
  /**
   * Sorts by date created, with the oldest items first.
   */
  OLDEST: (a, b) => {
    const item1 = a as { dateCreated?: string };
    const item2 = b as { dateCreated?: string };
    return (
      (item1.dateCreated ? new Date(item1.dateCreated) : new Date(0)).getTime() -
      (item2.dateCreated ? new Date(item2.dateCreated) : new Date(0)).getTime()
    );
  },

  /**
   * Sorts by date created, with the newest items first.
   */
  NEWEST: (a, b) => {
    const item1 = a as { dateCreated?: string };
    const item2 = b as { dateCreated?: string };
    return (
      (item2.dateCreated ? new Date(item2.dateCreated) : new Date(0)).getTime() -
      (item1.dateCreated ? new Date(item1.dateCreated) : new Date(0)).getTime()
    );
  },

  /**
   * Sorts by number of times opened, with the most frequently opened items first.
   */
  MOST_FREQUENT: (a, b) => {
    const item1 = a as { timesOpened?: number };
    const item2 = b as { timesOpened?: number };
    return (item2.timesOpened || 0) - (item1.timesOpened || 0);
  },

  /**
   * Sorts by number of times opened, with the least frequently opened items first.
   */
  LEAST_FREQUENT: (a, b) => {
    const item1 = a as { timesOpened?: number };
    const item2 = b as { timesOpened?: number };
    return (item1.timesOpened || 0) - (item2.timesOpened || 0);
  },

  /**
   * Sorts by first opened date, with the oldest items first.
   */
  FIRST_OPENED: (a, b) => {
    const item1 = a as { firstOpened?: string };
    const item2 = b as { firstOpened?: string };
    return (
      (item1.firstOpened ? new Date(item1.firstOpened) : new Date(0)).getTime() -
      (item2.firstOpened ? new Date(item2.firstOpened) : new Date(0)).getTime()
    );
  },

  /**
   * Sorts by last opened date, with the most recently opened items first.
   */
  LAST_OPENED: (a, b) => {
    const item1 = a as { lastOpened?: string };
    const item2 = b as { lastOpened?: string };
    return (
      (item2.lastOpened ? new Date(item2.lastOpened) : new Date(0)).getTime() -
      (item1.lastOpened ? new Date(item1.lastOpened) : new Date(0)).getTime()
    );
  },

  /**
   * Sorts by average execution time, with the fastest items first.
   */
  FASTEST: (a, b) => {
    const item1 = a as { averageExecutionTime?: number };
    const item2 = b as { averageExecutionTime?: number };
    return (item1.averageExecutionTime || 0) - (item2.averageExecutionTime || 0);
  },

  /**
   * Sorts by average execution time, with the slowest items first.
   */
  SLOWEST: (a, b) => {
    const item1 = a as { averageExecutionTime?: number };
    const item2 = b as { averageExecutionTime?: number };
    return (item2.averageExecutionTime || 0) - (item1.averageExecutionTime || 0);
  },

  /**
   * Sorts alphabetically by name, with the items starting with A first.
   */
  ALPHA_ASC: (a, b) => {
    const item1 = a as { name: string };
    const item2 = b as { name: string };
    return item1.name.localeCompare(item2.name);
  },

  /**
   * Sorts alphabetically by name, with the items starting with Z first.
   */
  ALPHA_DESC: (a, b) => {
    const item1 = a as { name: string };
    const item2 = b as { name: string };
    return item2.name.localeCompare(item1.name);
  },
};

/**
 * Directions in which pins and groups can be moved.
 */
export enum Direction {
  DOWN,
  UP,
}

/**
 * Visibility options for pins and groups.
 */
export enum Visibility {
  USE_PARENT = "use_parent",
  VISIBLE = "visible",
  MENUBAR_ONLY = "menubar_only",
  VIEW_PINS_ONLY = "view_pins_only",
  HIDDEN = "hidden",
  DISABLED = "disabled",
}

/**
 * Actions that can be taken on pins.
 */
export enum PinAction {
  OPEN = "open",
  COPY = "copy",
  EDIT = "edit",
  DELETE = "delete",
  HIDE = "hide",
  DISABLE = "disable",
  MOVE = "move",
}
