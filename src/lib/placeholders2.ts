/**
 * @module lib/placeholders.ts Placeholders specification and utilities for applying/interacting with them.
 *
 * @summary Placeholder utilities.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-04 17:38:00
 * Last modified  : 2023-11-01 00:43:30
 */

/* eslint-disable @typescript-eslint/no-unused-vars */ // Disable since many placeholder functions have unused parameters that are kept for consistency.
import { AI, Toast, environment, getFrontmostApplication, showHUD, showToast } from "@raycast/api";
import { Clipboard } from "@raycast/api";
import { SupportedBrowsers, getCurrentURL, getTextOfWebpage } from "./browser-utils";
import * as fs from "fs";
import * as os from "os";
import * as crypto from "crypto";
import * as vm from "vm";
import { getStorage, setStorage } from "./utils";
import { SORT_FN, StorageKey, SORT_STRATEGY } from "./constants";
import { execSync } from "child_process";
import { Pin, getPinStatistics, getPreviousPin, sortPins } from "./Pins";
import { LocalDataObject, getFinderSelection } from "./LocalData";
import path from "path";
import { runAppleScript } from "@raycast/utils";
import { LocationManager } from "./scripts";
import { scheduleTargetEvaluation } from "./scheduled-execution";
import { Group } from "./Groups";

/**
 * A placeholder type that associates Regex patterns with functions that applies the placeholder to a string, rules that determine whether or not the placeholder should be replaced, and aliases that can be used to achieve the same result.
 */
type Placeholder = {
  [key: string]: {
    /**
     * The detailed name of the placeholder.
     */
    name: string;

    /**
     * The aliases for the placeholder. Any of these aliases can be used in place of the placeholder to achieve the same result.
     */
    aliases?: string[];

    /**
     * The rules that determine whether or not the placeholder should be replaced. If any of these rules return true, the placeholder will be replaced. If no rules are provided, the placeholder will always be replaced.
     */
    rules: ((str: string, context?: LocalDataObject) => Promise<boolean>)[];

    /**
     * The function that applies the placeholder to a string.
     * @param str The string to apply the placeholder to.
     * @returns The string with the placeholder applied.
     */
    apply: (str: string, context?: LocalDataObject) => Promise<string>;
  };
};

/**
 * Placeholder specification.
 */
const placeholders: Placeholder = {

  /**
   * Placeholder for a summary of the user's current location.
   */
  "{{location}}": {
    name: "Location",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      const location = await LocationManager.getLocation();
      const address = `${location.streetNumber} ${location.street}, ${location.city}, ${location.state} ${location.postalCode}`;
      return `Address: ${address}, ${location.country}${
        address.includes(location.name.toString()) ? `` : `\nName: ${location.name}`
      }\nLatitude: ${location.latitude}\nLongitude: ${location.longitude}`;
    },
  },

  /**
   * Placeholder for the name of the user's current latitude.
   */
  "{{latitude}}": {
    name: "Latitude",
    aliases: ["{{lat}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      return (await LocationManager.getLatitude()).toString();
    },
  },

  /**
   * Placeholder for the name of the user's current longitude.
   */
  "{{longitude}}": {
    name: "Longitude",
    aliases: ["{{long}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      return (await LocationManager.getLongitude()).toString();
    },
  },

  /**
   * Placeholder for the name of the user's street address.
   */
  "{{address}}": {
    name: "Address",
    aliases: ["{{streetAddress}}"],
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      return await LocationManager.getStreetAddress();
    },
  },

  /**
   * Placeholder for the last application focused before the current application. If there is no previous application, this placeholder will not be replaced.
   */
  "{{previousApp}}": {
    name: "Previous Application",
    aliases: [
      "{{previousAppName}}",
      "{{lastApp}}",
      "{{lastAppName}}",
      "{{previousApplication}}",
      "{{lastApplication}}",
      "{{previousApplicationName}}",
      "{{lastApplicationName}}",
    ],
    rules: [
      async (str: string, context?: LocalDataObject) => {
        try {
          const recents = await getStorage(StorageKey.RECENT_APPS);
          if (!recents) return false;
          if (!Array.isArray(recents)) return false;
          return recents.length > 1;
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string, context?: LocalDataObject) => {
      const recents = await getStorage(StorageKey.RECENT_APPS);
      if (Array.isArray(recents)) {
        return recents[1].name;
      }
      return "";
    },
  },

  /**
   * Placeholder for the name of the most recently opened pin before the current one. If there is no last opened pin, this placeholder will not be replaced. The substitution will be URL-encoded.
   */
  "{{previousPinName}}": {
    name: "Last Opened Pin Name",
    aliases: ["{{lastPinName}}"],
    rules: [
      async (str: string, context?: LocalDataObject) => {
        try {
          const previousPin = getStorage(StorageKey.LAST_OPENED_PIN);
          if (!previousPin) return false;
          return true;
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        const previousPinTarget = (await getPreviousPin())?.name || "";
        return encodeURI(previousPinTarget);
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the target of the most recently opened pin before the current one. If there is no last opened pin, this placeholder will not be replaced. The substitution will be URL-encoded.
   */
  "{{previousPinTarget}}": {
    name: "Last Opened Pin Target",
    aliases: ["{{lastPinTarget}}"],
    rules: [
      async (str: string, context?: LocalDataObject) => {
        try {
          const previousPin = getStorage(StorageKey.LAST_OPENED_PIN);
          if (!previousPin) return false;
          return true;
        } catch (e) {
          return false;
        }
      },
    ],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        const previousPinTarget = (await getPreviousPin())?.url || "";
        return encodeURI(previousPinTarget);
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the comma-separated list of pin names. The list is sorted by most recently opened pin first.
   */
  "{{pinNames( amount=[0-9]+)?}}": {
    name: "Pin Names",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");
      try {
        const pins: Pin[] = (await getStorage(StorageKey.LOCAL_PINS)) || [];
        if (numToSelect >= 0) {
          numToSelect = Math.min(numToSelect, pins.length);
          while (pins.length > numToSelect) {
            pins.splice(Math.floor(Math.random() * pins.length), 1);
          }
        }
        const pinNames = pins
          .sort((a, b) => new Date(b.lastOpened || 0).getTime() - new Date(a.lastOpened || 0).getTime())
          .map((pin) => pin.name);
        return pinNames.join(", ");
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the newline-separated list of pin targets. The list is sorted by most recently opened pin first.
   */
  "{{pinTargets( amount=[0-9]+)?}}": {
    name: "Pin Targets",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");
      try {
        const pins: Pin[] = (await getStorage(StorageKey.LOCAL_PINS)) || [];
        if (numToSelect >= 0) {
          numToSelect = Math.min(numToSelect, pins.length);
          while (pins.length > numToSelect) {
            pins.splice(Math.floor(Math.random() * pins.length), 1);
          }
        }
        const pinTargets = sortPins(pins, [], undefined, SORT_FN.LAST_OPENED).map((pin) => pin.url);
        return pinTargets.join(", ").replaceAll("{{", "[[").replaceAll("}}", "]]");
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the JSON representation of all pins.
   */
  "{{pins( amount=[0-9]+)?}}": {
    name: "Pins JSON",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");
      try {
        const pins: Pin[] = (await getStorage(StorageKey.LOCAL_PINS)) || [];
        if (numToSelect >= 0) {
          numToSelect = Math.min(numToSelect, pins.length);
          const selectedPins = [];
          for (let i = 0; i < numToSelect; i++) {
            const randomIndex = Math.floor(Math.random() * pins.length);
            selectedPins.push(pins[randomIndex]);
            pins.splice(randomIndex, 1);
          }
          return JSON.stringify(selectedPins).replaceAll("{{", "[[").replaceAll("}}", "]]");
        }
        return JSON.stringify(pins).replaceAll("{{", "[[").replaceAll("}}", "]]");
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the JSON representation of all pins.
   */
  '{{(statistics|stats|pinStats|pinStatistics)( sort="(alpha|alphabetical|freq|frequency|recency|dateCreated)")?( amount=[0-9]+)?}}':
    {
      name: "Pin Statistics",
      rules: [],
      apply: async (str: string, context?: LocalDataObject) => {
        let sortMethod = str.match(/(?<=sort=("|')).*?(?=("|'))/)?.[0] || "freq";
        if (sortMethod == "alpha") sortMethod = "alphabetical";
        if (sortMethod == "freq") sortMethod = "frequency";

        let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");

        try {
          const pins: Pin[] = (await getStorage(StorageKey.LOCAL_PINS)) || [];
          const groups: Group[] = (await getStorage(StorageKey.LOCAL_GROUPS)) || [];

          if (numToSelect >= 0) {
            numToSelect = Math.min(numToSelect, pins.length);
            while (pins.length > numToSelect) {
              pins.splice(Math.floor(Math.random() * pins.length), 1);
            }
          }

          const stats = sortPins(pins, groups, sortMethod as keyof typeof SORT_STRATEGY).map(
            (pin) => `${pin.name}:\n\t${(getPinStatistics(pin, pins) as string).replaceAll("\n\n", "\n\t")}`,
          );
          return stats.join("\n\n");
        } catch (e) {
          return "";
        }
      },
    },

  /**
   * Placeholder for the comma-separated list of group names. The list's order matches the order of groups in the 'View Pins' command.
   */
  "{{groupNames( amount=[0-9]+)?}}": {
    name: "Group Names",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");
      try {
        const groups: Group[] = (await getStorage(StorageKey.LOCAL_GROUPS)) || [];
        if (numToSelect >= 0) {
          numToSelect = Math.min(numToSelect, groups.length);
          while (groups.length > numToSelect) {
            groups.splice(Math.floor(Math.random() * groups.length), 1);
          }
        }
        return groups.map((group) => group.name).join(", ");
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Placeholder for the JSON representation of all groups.
   */
  "{{groups( amount=[0-9]+)?}}": {
    name: "Groups JSON",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");
      try {
        const groups: Group[] = (await getStorage(StorageKey.LOCAL_GROUPS)) || [];
        if (numToSelect >= 0) {
          numToSelect = Math.min(numToSelect, groups.length);
          while (groups.length > numToSelect) {
            groups.splice(Math.floor(Math.random() * groups.length), 1);
          }
        }
        return JSON.stringify(groups).replaceAll("{{", "[[").replaceAll("}}", "]]");
      } catch (e) {
        return "";
      }
    },
  },

  /**
   * Directive to query Raycast AI and insert the response. If the query fails, the placeholder will be replaced with an empty string.
   *
   * Syntax: `{{ai:prompt}}` or `{{ai model="[model]":prompt}}` or `{{ai model="[model]" creativity=[decimal]:prompt}}`
   *
   * The model and creativity are optional. The default model is `gpt-3.5-turbo` and the default creativity is `1.0`. The model can be either `gpt-3.5-turbo` or `text-davinci-003`. The creativity must be a decimal between 0 and 1.
   */
  '{{(askAI|askai|AI|ai)( model="(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)")?( creativity=(([^{]|{(?!{)|{{[\\s\\S]*?}})*?))?:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}':
    {
      name: "Ask AI",
      rules: [],
      apply: async (str: string, context?: LocalDataObject) => {
        const matches = str.match(
          /{{(askAI|askai|AI|ai)( model="(([^{]|{(?!{)|{{[\s\S]*?}})*?)")?( creativity=(([^{]|{(?!{)|{{[\s\S]*?}})*?))?:(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/,
        );
        if (matches && environment.canAccess(AI)) {
          const toast = await showToast({ title: "Querying AI...", style: Toast.Style.Animated });
          const model = matches[3] == "text-davinci-003" ? "text-davinci-003" : "gpt-3.5-turbo";
          const creativity = matches[6] || "1.0";
          let query = matches[8].substring(0, model == "text-davinci-003" ? 4000 : 2048);
          let result = "";
          let attempt = 0;
          let waiting = true;
          while (waiting) {
            try {
              result = await AI.ask(query, { model: model, creativity: parseFloat(creativity) || 1.0 });
            } catch {
              attempt++;
              query = query.substring(0, query.length / 1.5);
            }
            if (result != "" || attempt > 10) {
              waiting = false;
            }
          }
          toast.title = "Received Response";
          toast.style = Toast.Style.Success;
          return result.trim().replaceAll('"', "'");
        }
        return "";
      },
    },

  /**
   * Placeholder for output of a JavaScript script. If the script fails, this placeholder will be replaced with an empty string. The script is run in a sandboxed environment.
   */
  "{{(js|JS):(.|[ \\n\\r\\s])*?}}": {
    name: "JavaScript",
    rules: [],
    apply: async (str: string, context?: LocalDataObject) => {
      try {
        const script = str.match(/(?<=(js|JS):)(.|[ \n\r\s])*?(?=}})/)?.[0];
        if (!script) return "";
        const sandbox = {
          clipboardText: async () => await Placeholders.allPlaceholders["{{clipboardText}}"].apply("{{clipboardText}}"),
          selectedText: async () => await Placeholders.allPlaceholders["{{selectedText}}"].apply("{{selectedText}}"),
          currentAppName: async () =>
            await Placeholders.allPlaceholders["{{currentAppName}}"].apply("{{currentAppName}}"),
          currentAppPath: async () =>
            await Placeholders.allPlaceholders["{{currentAppPath}}"].apply("{{currentAppPath}}"),
          currentDirectory: async () =>
            await Placeholders.allPlaceholders["{{currentDirectory}}"].apply("{{currentDirectory}}"),
          currentURL: async () => await Placeholders.allPlaceholders["{{currentURL}}"].apply("{{currentURL}}"),
          user: async () => await Placeholders.allPlaceholders["{{user}}"].apply("{{user}}"),
          homedir: async () => await Placeholders.allPlaceholders["{{homedir}}"].apply("{{homedir}}"),
          hostname: async () => await Placeholders.allPlaceholders["{{hostname}}"].apply("{{hostname}}"),
          date: async (format?: string) =>
            await Placeholders.allPlaceholders[`{{date( format=("|').*?("|'))?}}`].apply(
              `{{date${format ? ` format="${format}"` : ""}}}`,
            ),
          time: async () => await Placeholders.allPlaceholders[`{{time( format=("|').*?("|'))?}}`].apply("{{time}}"),
          timezone: async () => await Placeholders.allPlaceholders["{{timezone}}"].apply("{{timezone}}"),
          day: async () => await Placeholders.allPlaceholders[`{{day( locale=("|').*?("|'))?}}`].apply("{{day}}"),
          currentTabText: async () =>
            await Placeholders.allPlaceholders["{{currentTabText}}"].apply("{{currentTabText}}"),
          systemLanguage: async () =>
            await Placeholders.allPlaceholders["{{systemLanguage}}"].apply("{{systemLanguage}}"),
          previousApp: async () => await Placeholders.allPlaceholders["{{previousApp}}"].apply("{{previousApp}}"),
          uuid: async () => await Placeholders.allPlaceholders["{{uuid}}"].apply("{{uuid}}"),
          usedUUIDs: async () => await Placeholders.allPlaceholders["{{usedUUIDs}}"].apply("{{usedUUIDs}}"),
          url: async (url: string) => await Placeholders.allPlaceholders["{{(url|URL):.*?}}"].apply(`{{url:${url}}}`),
          as: async (script: string) =>
            await Placeholders.allPlaceholders["{{(as|AS):(.|[ \\n\\r\\s])*?}}"].apply(`{{as:${script}}}`),
          jxa: async (script: string) =>
            await Placeholders.allPlaceholders["{{(jxa|JXA):(.|[ \\n\\r\\s])*?}}"].apply(`{{jxa:${script}}}`),
          shell: async (script: string) =>
            await Placeholders.allPlaceholders["{{shell( .*)?:(.|[ \\n\\r\\s])*?}}"].apply(`{{shell:${script}}}`),
          previousPinName: async () =>
            await Placeholders.allPlaceholders["{{previousPinName}}"].apply("{{previousPinName}}"),
          previousPinTarget: async () =>
            await Placeholders.allPlaceholders["{{previousPinTarget}}"].apply("{{previousPinTarget}}"),
          reset: async (variable: string) =>
            await Placeholders.allPlaceholders["{{reset [a-zA-Z0-9_]+}}"].apply(`{{reset ${variable}}}`),
          get: async (variable: string) =>
            await Placeholders.allPlaceholders["{{get [a-zA-Z0-9_]+}}"].apply(`{{get ${variable}}}`),
          delete: async (variable: string) =>
            await Placeholders.allPlaceholders["{{delete [a-zA-Z0-9_]+}}"].apply(`{{delete ${variable}}}`),
          set: async (variable: string, value: string) =>
            await Placeholders.allPlaceholders["{{set [a-zA-Z0-9_]+:.*?}}"].apply(`{{set ${variable}:${value}}}`),
          shortcut: async (name: string) =>
            await Placeholders.allPlaceholders["{{shortcut:([\\s\\S]+?)( input=(\"|').*?(\"|'))?}}"].apply(
              `{{shortcut:${name}}}`,
            ),
          selectedFiles: async () => await Placeholders.allPlaceholders["{{selectedFiles}}"].apply("{{selectedFiles}}"),
          selectedFileContents: async () =>
            await Placeholders.allPlaceholders["{{selectedFileContents}}"].apply("{{selectedFileContents}}"),
          shortcuts: async () => await Placeholders.allPlaceholders["{{shortcuts}}"].apply("{{shortcuts}}"),
          copy: async (text: string) =>
            await Placeholders.allPlaceholders["{{copy:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}"].apply(`{{copy:${text}}}`),
          paste: async (text: string) =>
            await Placeholders.allPlaceholders["{{paste:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}"].apply(`{{paste:${text}}}`),
          ignore: async (text: string) =>
            await Placeholders.allPlaceholders["{{(ignore|IGNORE):[^}]*?}}"].apply(`{{ignore:${text}}}`),
          ai: async (prompt: string, model?: string, creativity?: number) =>
            await Placeholders.allPlaceholders[
              '{{(askAI|askai|AI|ai)( model="(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)")?( creativity=(([^{]|{(?!{)|{{[\\s\\S]*?}})*?))?:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}'
            ].apply(
              `{{ai${model ? ` model="${model}"` : ""}${creativity ? ` creativity=${creativity}` : ""}:${prompt}}}`,
            ),
          alert: async (message: string, title?: string, timeout?: number) =>
            await Placeholders.allPlaceholders[
              '{{alert( timeout=([0-9]+))?( title="(([^{]|(?!{)|{{[\\s\\S]*?}})*?)")?:(([^{]|{(?!{)|{{[\\s\\S]*?}})+?)}}'
            ].apply(`{{alert${timeout ? ` timeout=${timeout}` : ""}${title ? ` title="${title}"` : ""}:${message}}}`),
          dialog: async (message: string, input?: boolean, timeout?: number, title?: string) =>
            await Placeholders.allPlaceholders[
              '{{dialog( input=(true|false))?( timeout=([0-9]+))?( title="(([^{]|(?!{)|{{[\\s\\S]*?}})*?)")?:(([^{]|{(?!{)|{{[\\s\\S]*?}})+?)}}'
            ].apply(
              `{{dialog${input ? " input=true" : ""}${timeout ? ` timeout=${timeout}` : ""}${
                title ? ` title="${title}"` : ""
              }:${message}}}`,
            ),
          say: async (message: string, voice?: string, speed?: number, pitch?: number, volume?: number) =>
            await Placeholders.allPlaceholders[
              '{{say( voice="[A-Za-z)( ._-]")?( speed=[0-9.]+?)?( pitch=([0-9.]+?))?( volume=[0-9.]+?)?:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}'
            ].apply(
              `{{say${voice ? ` voice="${voice}"` : ""}${speed ? ` speed=${speed}` : ""}${
                pitch ? ` pitch=${pitch}` : ""
              }${volume ? ` volume=${volume}` : ""}:${message}}}`,
            ),
          toast: async (title: string, message?: string) =>
            await Placeholders.allPlaceholders[
              '{{(toast|hud|HUD)( style="(success|failure|fail)")?( message="(([^{]|(?!{)|{{[\\s\\S]*?}})*?)")?:(([^{]|{(?!{)|{{[\\s\\S]*?}})+?)}}'
            ].apply(`{{toast${message ? ` message="${message}"` : ""}:${title}}}`),
          hud: async (title: string, message?: string) =>
            await Placeholders.allPlaceholders[
              '{{(toast|hud|HUD)( style="(success|failure|fail)")?( message="(([^{]|(?!{)|{{[\\s\\S]*?}})*?)")?:(([^{]|{(?!{)|{{[\\s\\S]*?}})+?)}}'
            ].apply(`{{hud${message ? ` message="${message}"` : ""}:${title}}}`),
          runningApplications: async (delim?: string) =>
            await Placeholders.allPlaceholders[
              '{{runningApplications( (delim|delimiter|delimiters|delims)="(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)")?}}'
            ].apply(`{{runningApplications${delim ? ` delim="${delim}"` : ""}}}`),
          location: async () => await Placeholders.allPlaceholders["{{location}}"].apply(`{{location}}`),
          latitude: async () => await Placeholders.allPlaceholders["{{latitude}}"].apply(`{{latitude}}`),
          longitude: async () => await Placeholders.allPlaceholders["{{longitude}}"].apply(`{{longitude}}`),
          address: async () => await Placeholders.allPlaceholders["{{address}}"].apply(`{{address}}`),
        };
        return await vm.runInNewContext(script, sandbox, { timeout: 1000, displayErrors: true });
      } catch (e) {
        return "";
      }
    },
  },
};

/**
 * Applies placeholders to a single string.
 * @param str The string to apply placeholders to.
 * @returns The string with placeholders applied.
 */
const applyToString = async (str: string, context?: LocalDataObject) => {
  let subbedStr = str;
  const placeholderDefinition = Object.entries(placeholders);
  for (const [key, placeholder] of placeholderDefinition) {
    if (
      !subbedStr.match(new RegExp(key, "g")) &&
      (placeholder.aliases?.every((alias) => !subbedStr.match(new RegExp(alias, "g"))) || !placeholder.aliases?.length)
    )
      continue;
    if (placeholder.aliases && placeholder.aliases.some((alias) => subbedStr.indexOf(alias) != -1)) {
      for (const alias of placeholder.aliases) {
        while (subbedStr.match(new RegExp(alias, "g")) != undefined) {
          subbedStr = subbedStr.replace(new RegExp(alias), await placeholder.apply(subbedStr, context));
        }
      }
    } else {
      while (subbedStr.match(new RegExp(key, "g")) != undefined) {
        subbedStr = subbedStr.replace(new RegExp(key), await placeholder.apply(subbedStr, context));
      }
    }
  }
  return subbedStr;
};

/**
 * Applies placeholders to an array of strings.
 * @param strs The array of strings to apply placeholders to.
 * @returns The array of strings with placeholders applied.
 */
const applyToStrings = async (strs: string[], context?: LocalDataObject) => {
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
const applyToObjectValueWithKey = async (obj: { [key: string]: unknown }, key: string, context?: LocalDataObject) => {
  const value = obj[key];
  if (typeof value === "string") {
    return await applyToString(value);
  } else if (Array.isArray(value)) {
    return await applyToStrings(value);
  } else if (typeof value === "object") {
    return await applyToObjectValuesWithKeys(
      value as { [key: string]: unknown },
      Object.keys(value as { [key: string]: unknown }),
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
const applyToObjectValuesWithKeys = async (
  obj: { [key: string]: unknown },
  keys: string[],
  context?: LocalDataObject,
) => {
  const subbedObj: { [key: string]: unknown } = {};
  for (const key of keys) {
    subbedObj[key] = await applyToObjectValueWithKey(obj, key);
  }
  return subbedObj;
};

/**
 * Wrapper for all placeholder functions.
 */
export const Placeholders = {
  allPlaceholders: placeholders,
  applyToString: applyToString,
  applyToStrings: applyToStrings,
  applyToObjectValueWithKey: applyToObjectValueWithKey,
  applyToObjectValuesWithKeys: applyToObjectValuesWithKeys,
};

/**
 * A user-defined variable created via the {{set:...}} placeholder. These variables are stored in the extension's persistent local storage.
 */
export interface PersistentVariable {
  name: string;
  value: string;
  initialValue: string;
}

/**
 * Gets the current value of persistent variable from the extension's persistent local storage.
 * @param name The name of the variable to get.
 * @returns The value of the variable, or an empty string if the variable does not exist.
 */
export const getPersistentVariable = async (name: string): Promise<string> => {
  const vars: PersistentVariable[] = await getStorage(StorageKey.PERSISTENT_VARS);
  const variable = vars.find((variable) => variable.name == name);
  if (variable) {
    return variable.value;
  }
  return "";
};

/**
 * Sets the value of a persistent variable in the extension's persistent local storage. If the variable does not exist, it will be created. The most recently set variable will be always be placed at the end of the list.
 * @param name The name of the variable to set.
 * @param value The initial value of the variable.
 */
export const setPersistentVariable = async (name: string, value: string) => {
  const vars: PersistentVariable[] = await getStorage(StorageKey.PERSISTENT_VARS);
  const variable = vars.find((variable) => variable.name == name);
  if (variable) {
    vars.splice(vars.indexOf(variable), 1);
    variable.value = value;
    vars.push(variable);
  } else {
    vars.push({ name: name, value: value, initialValue: value });
  }
  await setStorage(StorageKey.PERSISTENT_VARS, vars);
};

/**
 * Resets the value of a persistent variable to its initial value. If the variable does not exist, nothing will happen.
 * @param name The name of the variable to reset.
 */
export const resetPersistentVariable = async (name: string): Promise<string> => {
  const vars: PersistentVariable[] = await getStorage(StorageKey.PERSISTENT_VARS);
  const variable = vars.find((variable) => variable.name == name);
  if (variable) {
    vars.splice(vars.indexOf(variable), 1);
    variable.value = variable.initialValue;
    vars.push(variable);
    await setStorage(StorageKey.PERSISTENT_VARS, vars);
    return variable.value;
  }
  return "";
};

/**
 * Deletes a persistent variable from the extension's persistent local storage. If the variable does not exist, nothing will happen.
 * @param name The name of the variable to delete.
 */
export const deletePersistentVariable = async (name: string) => {
  const vars: PersistentVariable[] = await getStorage(StorageKey.PERSISTENT_VARS);
  const variable = vars.find((variable) => variable.name == name);
  if (variable) {
    vars.splice(vars.indexOf(variable), 1);
    await setStorage(StorageKey.PERSISTENT_VARS, vars);
  }
};
