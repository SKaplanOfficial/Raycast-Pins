import path from 'path';

import { Color, Icon, List } from '@raycast/api';

import { LocalObjectMap } from '../hooks/useLocalObjectStore';
import { SORT_STRATEGY, Visibility } from './common';
import { Group, isGroup } from './group';
import { getLinkedPins, Pin } from './pin';
import PinsPlaceholders from './placeholders';
import { ViewGroupsPreferences, ViewPinsPreferences } from './preferences';
import { Tag } from './tag';
import { pluralize } from './utils';

/**
 * Maps amount to color based on its intensity relative to a maximum value.
 * @param amount The amount to map to a color.
 * @param maxAmount The maximum amount.
 * @returns A color.
 */
export const colorByAmount = (amount: number, maxAmount: number) => {
  const colors = [Color.Red, Color.Orange, Color.Yellow, Color.Green, Color.Blue, Color.Purple];
  const index = Math.floor((amount / maxAmount) * (colors.length - 1));
  return colors[index % colors.length];
};

/**
 * Gets the visibility accessory for a pin or group.
 * @param item The pin or group to get the accessory for.
 * @param showingHidden Whether hidden items are being shown.
 * @returns The visibility accessory, if any.
 */
export function getVisibilityAccessory(item: Pin | Group, showingHidden: boolean) {
  switch (item.visibility) {
    case Visibility.MENUBAR_ONLY:
      return { tag: { value: "Menubar Only", color: Color.Blue }, tooltip: "Visible in Menubar Only" };
    case Visibility.VIEW_PINS_ONLY:
      return showingHidden
        ? { tag: { value: "'View Pins' Only", color: Color.Purple }, tooltip: "Visible in 'View Pins' Only" }
        : undefined;
    case Visibility.HIDDEN:
      return { tag: "Hidden", tooltip: `Hidden — Use Deeplinks to Open${isGroup(item) ? " Pins" : ""}` };
    case Visibility.DISABLED:
      return {
        tag: { value: "Disabled", color: Color.Red },
        tooltip: isGroup(item) ? "Group Disabled — Member Pins Cannot be Opened" : "Pin Disabled — Cannot be Opened",
      };
  }
}

/**
 * Gets the accessories for a pin list item.
 * @param pin The pin to get the accessories for.
 * @param preferences The preferences for the extension.
 * @param showingHidden Whether hidden items are being shown.
 * @param maxFrequency The maximum number of times any pin has been opened.
 * @param lastOpenedPin The most recently opened pin.
 * @param pins The list of all pins.
 * @param groups The list of all groups.
 * @param tagMap The map of tag names to tags.
 * @returns The list of accessory items.
 */
export function getPinAccessories(
  pin: Pin,
  preferences: ExtensionPreferences & ViewPinsPreferences,
  showingHidden: boolean,
  maxFrequency: number,
  pins: Pin[],
  groups: Group[],
  tagMap: LocalObjectMap<Tag>,
  lastOpenedPin?: Pin,
) {
  const acc: List.Item.Accessory[] = [];
  const visibilityAccessory = preferences.showVisibility ? getVisibilityAccessory(pin, showingHidden) : undefined;
  if (visibilityAccessory) {
    acc.push(visibilityAccessory);
  }

  if (preferences.showLastOpened && pin.lastOpened && pin.id == lastOpenedPin?.id) {
    acc.push({ icon: Icon.Clock, tooltip: `Last Opened ${new Date(pin.lastOpened).toLocaleString()}` });
  }

  if (preferences.showCreationDate && pin.dateCreated) {
    acc.push({ icon: Icon.Calendar, tooltip: `Created On ${new Date(pin.dateCreated).toLocaleString()}` });
  }

  if (preferences.showExpiration && pin.expireDate) {
    const expirationDate = new Date(pin.expireDate);
    const dateString = expirationDate.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    acc.push({ date: expirationDate, tooltip: `Expires On ${dateString}` });
  }

  const isTerminalCommand =
    !pin.fragment && !pin.url?.startsWith("/") && !pin.url?.startsWith("~") && !pin.url?.match(/^[a-zA-Z0-9]*?:.*/g);
  if (preferences.showApplication && pin.application && pin.application != "None") {
    acc.push({
      icon: { fileIcon: pin.application },
      tooltip: `Opens With ${path.basename(pin.application, ".app")}`,
    });
  }

  if (preferences.showExecutionVisibility && isTerminalCommand) {
    const regexes = PinsPlaceholders.map((placeholder) => placeholder.regex);
    const urlAfterRemovingPlaceholders = regexes.reduce((acc, regex) => acc.replace(regex, ""), pin.url);
    if (urlAfterRemovingPlaceholders.trim().length > 0) {
      acc.push({ icon: Icon.Terminal, tooltip: "Runs Terminal Command" });
      acc.push({
        icon: pin.execInBackground ? Icon.EyeDisabled : Icon.Eye,
        tooltip: pin.execInBackground ? "Executes in Background" : "Executes In New Terminal Tab",
      });
    }
  }

  if (preferences.showFragment && pin.fragment) {
    acc.push({ icon: Icon.Text, tooltip: "Text Fragment" });
  }

  const linkCount = preferences.showLinkCount ? getLinkedPins(pin, pins, groups).length : 0;
  if (linkCount > 0) {
    acc.push({
      tag: { value: linkCount.toString(), color: Color.SecondaryText },
      tooltip: `${linkCount} Linked ${pluralize("Pin", linkCount)}`,
      icon: Icon.Link,
    });
  }

  if (preferences.showFrequency && pin.timesOpened) {
    acc.push({
      tag: { value: pin.timesOpened.toString(), color: colorByAmount(pin.timesOpened, maxFrequency) },
      tooltip: `Opened ${pin.timesOpened} ${pluralize("Time", pin.timesOpened)}`,
      icon: Icon.PlayFilled,
    });
  }

  if (preferences.showTags && pin.tags) {
    for (const tagName of pin.tags) {
      const tag = tagMap.get(tagName);
      if (tag) {
        acc.push({ tag: { value: tag.name, color: tag.color }, tooltip: `Tagged '${tag.name}'` });
      }
    }
  }
  return acc;
}

/**
 * Gets the accessories for a group list item.
 * @param group The group to get the accessories for.
 * @param groups The list of all groups.
 * @param preferences The preferences for the extension.
 * @returns The list of accessory items.
 */
export function getGroupAccessories(group: Group, groups: Group[], preferences: ExtensionPreferences & ViewGroupsPreferences) {
  const acc = [];
  const visibilityAccessory = preferences.showVisibility ? getVisibilityAccessory(group, false) : undefined;
  if (visibilityAccessory) {
    acc.push(visibilityAccessory);
  }

  if (preferences.showSortStrategy && group.sortStrategy && group.sortStrategy !== SORT_STRATEGY.MANUAL) {
    acc.push({
      tag: {
        value: group.sortStrategy,
        color: Color.SecondaryText,
      },
    });
  }

  if (preferences.showParentGroup && group.parent) {
    const parentName = groups.find((g) => g.id == group.parent)?.name;
    acc.push({ tag: { value: `Parent: ${parentName}`, color: Color.SecondaryText } });
  }
  return acc;
}
