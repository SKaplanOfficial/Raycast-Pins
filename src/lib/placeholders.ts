/* eslint-disable @typescript-eslint/no-unused-vars */
import { getFrontmostApplication, getSelectedText } from "@raycast/api";
import { Clipboard } from "@raycast/api";
import { runAppleScript } from "run-applescript";

const placeholders: {
  [key: string]: {
    name: string;
    rules: ((str: string) => Promise<boolean>)[];
    apply: (str: string) => Promise<string>;
  };
} = {
  "{{clipboardText}}": {
    name: "Clipboard Text",
    rules: [
      async (str: string) => {
        try {
          return (await Clipboard.readText()) !== "";
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string) => {
      return (await Clipboard.readText()) || "";
    },
  },
  "{{selectedText}}": {
    name: "Selected Text",
    rules: [
      async (str: string) => {
        try {
          return (await getSelectedText()) !== "";
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string) => {
      return (await getSelectedText()) || "";
    },
  },
  "{{currentAppName}}": {
    name: "Current Application",
    rules: [],
    apply: async (str: string) => {
      return (await getFrontmostApplication()).name || "";
    },
  },
  "{{currentAppPath}}": {
    name: "Current Application Path",
    rules: [],
    apply: async (str: string) => {
      return (await getFrontmostApplication()).path || "";
    },
  },
  "{{currentDirectory}}": {
    name: "Current Directory",
    rules: [
      async (str: string) => {
        try {
          return (await getFrontmostApplication()).name == "Finder";
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string) => {
      return await runAppleScript(`tell application "Finder" to return POSIX path of (insertion location as alias)`);
    },
  },
};

const applyToString = async (str: string) => {
  let subbedStr = str;
  const placeholderDefinition = Object.entries(placeholders);
  for (const [key, placeholder] of placeholderDefinition) {
    if (subbedStr.indexOf(key) == -1) continue;
    subbedStr = subbedStr.replace(new RegExp(key, "g"), await placeholder.apply(str));
  }
  return subbedStr;
};

const applyToStrings = async (strs: string[]) => {
  const subbedStrs: string[] = [];
  for (const str of strs) {
    subbedStrs.push(await applyToString(str));
  }
  return subbedStrs;
};

const applyToObjectValueWithKey = async (obj: { [key: string]: unknown }, key: string) => {
  const value = obj[key];
  if (typeof value === "string") {
    return await applyToString(value);
  } else if (Array.isArray(value)) {
    return await applyToStrings(value);
  } else if (typeof value === "object") {
    return await applyToObjectValuesWithKeys(
      value as { [key: string]: unknown },
      Object.keys(value as { [key: string]: unknown })
    );
  } else {
    return (value || "undefined").toString();
  }
};

const applyToObjectValuesWithKeys = async (obj: { [key: string]: unknown }, keys: string[]) => {
  const subbedObj: { [key: string]: unknown } = {};
  for (const key of keys) {
    subbedObj[key] = await applyToObjectValueWithKey(obj, key);
  }
  return subbedObj;
};

export const Placeholders = {
  allPlaceholders: placeholders,
  applyToString: applyToString,
  applyToStrings: applyToStrings,
  applyToObjectValueWithKey: applyToObjectValueWithKey,
  applyToObjectValuesWithKeys: applyToObjectValuesWithKeys,
};
