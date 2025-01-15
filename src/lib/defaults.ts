import { LocalStorage, showToast, Toast } from "@raycast/api";

import { ItemType, StorageKey } from "./common";
import { buildGroup, getGroups, Group, validateGroups } from "./group";
import { buildPin, getPins, Pin, validatePins } from "./pin";
import { storageMethods } from "./storage";
import { saveObjects } from "../hooks/useLocalObjectStore";
import { buildTag, getTags, validateTags } from "./tag";

/**
 * Example pins and groups to help users get started.
 */
const examplePins: Partial<Pin>[] = [
  {
    name: "Google",
    url: "https://google.com",
    group: "None",
  },
  {
    name: "GitHub",
    url: "https://github.com",
    group: "Dev Utils",
  },
  {
    name: "Regex 101",
    url: "https://regex101.com",
    group: "Dev Utils",
  },
  {
    name: "Terminal",
    url: "/System/Applications/Utilities/Terminal.app",
    group: "Dev Utils",
    tags: ["terminal"],
  },
  {
    name: "New Folder Here",
    url: `osascript -e 'tell application "Finder"' -e 'set dirPath to folder (POSIX file "{{currentDirectory}}" as alias)' -e 'set newFolder to make new folder at dirPath' -e 'select newFolder' -e 'end tell'`,
    icon: "NewFolder",
    group: "Scripts",
    execInBackground: true,
  },
  {
    name: "New File Here",
    url: `osascript -e 'tell application "Finder"' -e 'set dirPath to folder (POSIX file "{{currentDirectory}}" as alias)' -e 'set newFile to make new file at dirPath' -e 'select newFile' -e 'end tell'`,
    icon: "NewDocument",
    group: "Scripts",
    execInBackground: true,
  },
  {
    name: "New Terminal Here",
    url: `cd {{currentDirectory}}`,
    icon: "Terminal",
    group: "Scripts",
  },
  {
    name: "ChatGPT",
    url: "https://chat.openai.com",
    group: "None",
  },
  {
    name: "Random Duck",
    url: "https://random-d.uk",
    group: "None",
  },
  {
    name: "Search On Google",
    url: "https://www.google.com/search?q={{selectedText}}",
    group: "None",
  },
  {
    name: "Raycast Developer Docs",
    url: "https://developers.raycast.com",
    group: "Raycast Stuff",
  },
  {
    name: "Raycast Script Commands",
    url: "https://github.com/raycast/script-commands",
    group: "Raycast Stuff",
  },
  {
    name: "Raycast Store",
    url: "https://www.raycast.com/store",
    group: "Raycast Stuff",
  },
  {
    name: "AI Joke",
    url: "{{alert:{{AI:Tell me a joke}}}}",
    icon: "Emoji",
    group: "Raycast AI Examples",
    iconColor: "raycast-green",
    tags: ["AI"],
  },
  {
    name: "Summarize Tab",
    url: '{{alert title="Tab Summary":{{AI:Summarize the following content sourced from {{currentURL}}: ###{{currentTabText}}###}}}}',
    icon: "Network",
    group: "Raycast AI Examples",
    tags: ["AI", "selection"],
  },
  {
    name: "Summarize Clipboard",
    url: '{{alert title="Clipboard Summary":{{AI:Summarize this: ###{{clipboardText}}###}}}}',
    icon: "Clipboard",
    group: "Raycast AI Examples",
    tags: ["AI"],
  },
  {
    name: "Date: {{date}}",
    url: "{{copy:{{date}}}}",
    icon: "Calendar",
    group: "Placeholder Examples",
  },
  {
    name: "Day: {{day}}",
    url: "{{copy:{{day}}}}",
    icon: "Calendar",
    group: "Placeholder Examples",
  },
  {
    name: "Time: {{time}}",
    url: "{{copy:{{time}}}}",
    icon: "Clock",
    group: "Placeholder Examples",
  },
  {
    name: "Reopen Last Application",
    url: "open -a '{{previousApplication}}'",
    icon: "RotateAntiClockwise",
    group: "Placeholder Examples",
    execInBackground: true,
  },
  {
    name: "Summarize Selected Text",
    url: '{{alert title="Selected Text Summary":{{AI:Summarize this: ###{{selectedText}}###}}}}',
    icon: "Text",
    group: "Raycast AI Examples",
    tags: ["AI", "selection"],
  },
  {
    name: "Copy Address",
    url: "{{copy:{{address}}}}",
    icon: "House",
    group: "Placeholder Examples",
  },
  {
    name: "Paste UUID",
    url: "{{paste:{{uuid}}}}",
    icon: "Number27",
    group: "Placeholder Examples",
  },
];

const exampleGroups: Partial<Group>[] = [
  {
    name: "Dev Utils",
    icon: "CodeBlock",
    itemType: ItemType.GROUP,
  },
  {
    name: "Scripts",
    icon: "Text",
    iconColor: "raycast-orange",
    itemType: ItemType.GROUP,
  },
  {
    name: "Raycast Stuff",
    icon: "RaycastLogoNeg",
    iconColor: "raycast-red",
    parent: "Dev Utils",
    itemType: ItemType.GROUP,
  },
  {
    name: "Placeholder Examples",
    icon: "Bolt",
    iconColor: "raycast-blue",
    itemType: ItemType.GROUP,
  },
  {
    name: "Raycast AI Examples",
    icon: "Stars",
    iconColor: "raycast-purple",
    parent: "Placeholder Examples",
    itemType: ItemType.GROUP,
  },
];

/**
 * Imports default pins and groups into local storage.
 */
export const installExamples = async (kind: ItemType) => {
  if (kind == ItemType.PIN) {
    const storedPins = await getPins();
    const newPins = examplePins
      .filter((pin) => !storedPins.some((storedPin) => storedPin.name == pin.name))
      .map((pin) => buildPin(pin));
    await saveObjects(newPins, storedPins, StorageKey.PIN_STORE, storageMethods, validatePins);

    const storedTags = await getTags();
    const newTags = examplePins
      .map((pin) => pin.tags)
      .flat()
      .filter((tag) => tag != undefined && !storedTags.some((storedTag) => storedTag.name == tag))
      .filter((tag, index, self) => self.indexOf(tag) === index)
      .map((tagName) => buildTag({ name: tagName }));
    await saveObjects(newTags, storedTags, StorageKey.TAG_STORE, storageMethods, validateTags);
    await LocalStorage.setItem(StorageKey.EXAMPLE_PINS_INSTALLED, true);
  }

  const storedGroups = await getGroups();
  const newGroups = exampleGroups
    .filter((group) => !storedGroups.some((storedGroup) => storedGroup.name == group.name))
    .map((group) => buildGroup(group));
  await saveObjects(newGroups, storedGroups, StorageKey.GROUP_STORE, storageMethods, validateGroups);
  await LocalStorage.setItem(StorageKey.EXAMPLE_GROUPS_INSTALLED, true);
  await showToast({ title: "Examples Installed!", style: Toast.Style.Success });
};
