/* eslint-disable @typescript-eslint/no-unused-vars */
import { getFrontmostApplication, getSelectedText } from "@raycast/api";
import { Clipboard } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { SupportedBrowsers, getCurrentURL, getTextOfWebpage } from "./browser-utils";
import * as os from "os";
import { getStorage } from "./utils";
import { StorageKey } from "./constants";

/**
 * Placeholder specification.
 */
const placeholders: {
  [key: string]: {
    name: string;
    aliases?: string[];
    rules: ((str: string) => Promise<boolean>)[];
    apply: (str: string) => Promise<string>;
  };
} = {
  /**
   * Placeholder for the text currently stored in the clipboard. If the clipboard is empty, this placeholder will not be replaced. Most clipboard content supplies a string format, such as file names when copying files in Finder.
   */
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

  /**
   * Placeholder for the currently selected text. If no text is selected, this placeholder will not be replaced.
   */
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

  /**
   * Placeholder for the name of the current application. Barring any issues, this should always be replaced.
   */
  "{{currentAppName}}": {
    name: "Current Application",
    rules: [],
    apply: async (str: string) => {
      return (await getFrontmostApplication()).name || "";
    },
  },

  /**
   * Placeholder for the path of the current application. Barring any issues, this should always be replaced.
   */
  "{{currentAppPath}}": {
    name: "Current Application Path",
    rules: [],
    apply: async (str: string) => {
      return (await getFrontmostApplication()).path || "";
    },
  },

  /**
   * Placeholder for the current working directory. If the current application is not Finder, this placeholder will not be replaced.
   */
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

  /**
   * Placeholder for the current URL in any supported browser. See {@link SupportedBrowsers} for the list of supported browsers. If the current application is not a supported browser, this placeholder will not be replaced.
   */
  "{{currentURL}}": {
    name: "Current URL",
    rules: [
      async (str: string) => {
        try {
          return SupportedBrowsers.includes((await getFrontmostApplication()).name);
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string) => {
      const appName = (await getFrontmostApplication()).name;
      return (await getCurrentURL(appName)).url;
    },
  },

  /**
   * Placeholder for the username of the currently logged-in user. Barring any issues, this should always be replaced.
   */
  "{{user}}": {
    name: "User",
    aliases: ["{{username}}"],
    rules: [],
    apply: async (str: string) => {
      return os.userInfo().username;
    },
  },

  /**
   * Placeholder for the home directory of the currently logged-in user. Barring any issues, this should always be replaced.
   */
  "{{homedir}}": {
    name: "Home Directory",
    aliases: ["{{homeDirectory}}"],
    rules: [],
    apply: async (str: string) => {
      return os.homedir();
    },
  },

  /**
   * Placeholder for the hostname of the current machine. Barring any issues, this should always be replaced.
   */
  "{{hostname}}": {
    name: "Hostname",
    rules: [],
    apply: async (str: string) => {
      return os.hostname();
    },
  },

  /**
   * Placeholder for the current date in the format "Month Day, Year". Barring any issues, this should always be replaced.
   * 
   * @todo Add support for custom date formats similar to Raycast's snippets date placeholder.
   */
  "{{date}}": {
    name: "Date",
    aliases: ["{{currentDate}}"],
    rules: [],
    apply: async (str: string) => {
      return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    },
  },

  /**
   * Placeholder for the current time in the format "Hour:Minute". Barring any issues, this should always be replaced.
   * 
   * @todo Add support for custom time formats.
   */
  "{{time}}": {
    name: "Time",
    aliases: ["{{currentTime}}"],
    rules: [],
    apply: async (str: string) => {
      return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric" });
    },
  },

  /**
   * Placeholder for the visible text of the current tab in any supported browser. See {@link SupportedBrowsers} for the list of supported browsers. If the current application is not a supported browser, this placeholder will not be replaced.
   */
  "{{currentTabText}}": {
    name: "Current Tab Text",
    rules: [
      async (str: string) => {
        try {
          return SupportedBrowsers.includes((await getFrontmostApplication()).name);
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string) => {
      const appName = (await getFrontmostApplication()).name;
      const URL = (await getCurrentURL(appName)).url;
      const URLText = await getTextOfWebpage(URL);
      return URLText;
    },
  },

  /**
   * Placeholder for the default language for the current user. Barring any issues, this should always be replaced.
   */
  "{{systemLanguage}}": {
    name: "System Language",
    aliases: ["{{language}}"],
    rules: [],
    apply: async (str: string) => {
      return await runAppleScript(`use framework "Foundation"
                set locale to current application's NSLocale's autoupdatingCurrentLocale()
                set langCode to locale's languageCode()
                return locale's localizedStringForLanguageCode:langCode`);
    },
  },

  /**
   * Placeholder for the last application focused before the current application. If there is no previous application, this placeholder will not be replaced.
   */
  "{{previousApp}}": {
    name: "Previous Application",
    aliases: ["{{previousAppName}}", "{{lastApp}}", "{{lastAppName}}"],
    rules: [
      async (str: string) => {
        try {
          const recents = getStorage(StorageKey.RECENT_APPS);
          if (!recents) return false;
          if (!Array.isArray(recents)) return false;
          return recents.length > 1;
        } catch (e) {
          return false;
        }
      }
    ],
    apply: async (str: string) => {
      const recents = getStorage(StorageKey.RECENT_APPS);
      if (Array.isArray(recents)) {
        return recents[1];
      }
      return "";
    }
  }
};

/**
 * Applies placeholders to a single string.
 * @param str The string to apply placeholders to.
 * @returns The string with placeholders applied.
 */
const applyToString = async (str: string) => {
  let subbedStr = str;
  const placeholderDefinition = Object.entries(placeholders);
  for (const [key, placeholder] of placeholderDefinition) {
    if (subbedStr.indexOf(key) == -1 && (placeholder.aliases?.every((alias) => subbedStr.indexOf(alias) == -1) || !placeholder.aliases?.length)) continue;
    if (placeholder.aliases && placeholder.aliases.some((alias) => subbedStr.indexOf(alias) != -1)) {
      for (const alias of placeholder.aliases) {
        subbedStr = subbedStr.replace(new RegExp(alias, "g"), await placeholder.apply(str));
      }
    } else {
      subbedStr = subbedStr.replace(new RegExp(key, "g"), await placeholder.apply(str));
    }
  }
  return subbedStr;
};

/**
 * Applies placeholders to an array of strings.
 * @param strs The array of strings to apply placeholders to.
 * @returns The array of strings with placeholders applied.
 */
const applyToStrings = async (strs: string[]) => {
  const subbedStrs: string[] = [];
  for (const str of strs) {
    subbedStrs.push(await applyToString(str));
  }
  return subbedStrs;
};

/**
 * Applies placeholders to the value of a single key in an object.
 * @param obj The object to apply placeholders to.
 * @param key The key of the value to apply placeholders to.
 * @returns The object with placeholders applied.
 */
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

/**
 * Applies placeholders to an object's values, specified by keys.
 * @param obj The object to apply placeholders to.
 * @param keys The keys of the object to apply placeholders to.
 * @returns The object with placeholders applied.
 */
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
