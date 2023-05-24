import { runAppleScript } from "run-applescript";

/**
 * Gets the URL of the active tab in Safari.
 *
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getCurrentSafariURL = async (): Promise<{ name: string; url: string }> => {
  const data = await runAppleScript(`try
      set oldDelims to AppleScript's text item delimiters
      set AppleScript's text item delimiters to "\`\`\`"
          tell application "Safari"
              set theData to {name, URL} of document 1
              set theData to theData as string
              set AppleScript's text item delimiters to oldDelims
              return theData
          end tell
      end try`);
  const entries = data.split("```");
  if (entries.length === 2) {
    return { name: entries[0], url: entries[1] };
  }
  return { name: "", url: "" };
};

const getSafariTabs = async (): Promise<{ name: string; url: string }[]> => {
  const data = await runAppleScript(`try
    set oldDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to "\`\`\`"
    tell application "Safari"
      set theData to {name, URL} of tabs of window 1
      set theData to theData as string
      set AppleScript's text item delimiters to oldDelims
      return theData
    end tell
  end try`);
  const entries = data.split("```");
  const names = entries.slice(0, entries.length / 2);
  const urls = entries.slice(entries.length / 2);
  return names.map((name, i) => ({ name: name, url: urls[i] }));
};

/**
 * Gets the URL of the active tab in Arc.
 *
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getArcURL = async (): Promise<{ name: string; url: string }> => {
  const data = await runAppleScript(`try
      set oldDelims to AppleScript's text item delimiters
      set AppleScript's text item delimiters to "\`\`\`"
          tell application "Arc"
              set theData to {title, URL} of active tab of window 1
              set theData to theData as string
              set AppleScript's text item delimiters to oldDelims
              return theData
          end tell
      end try`);
  const entries = data.split("```");
  if (entries.length === 2) {
    return { name: entries[0], url: entries[1] };
  }
  return { name: "", url: "" };
};

const getArcTabs = async (): Promise<{ name: string; url: string }[]> => {
  const data = await runAppleScript(`try
    set oldDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to "\`\`\`"
    tell application "Arc"
      set theData to {title, URL} of tabs of window 1
      set theData to theData as string
      set AppleScript's text item delimiters to oldDelims
      return theData
    end tell
  end try`);
  const entries = data.split("```");
  const names = entries.slice(0, entries.length / 2);
  const urls = entries.slice(entries.length / 2);
  return names.map((name, i) => ({ name: name, url: urls[i] }));
};

/**
 * Gets the URL of the active tab in iCab.
 *
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getiCabURL = async (): Promise<{ name: string; url: string }> => {
  const data = await runAppleScript(`try
      set oldDelims to AppleScript's text item delimiters
      set AppleScript's text item delimiters to "\`\`\`"
          tell application "iCab"
              set theData to {name, url} of document 1
              set theData to theData as string
              set AppleScript's text item delimiters to oldDelims
              return theData
          end tell
      end try`);
  const entries = data.split("```");
  if (entries.length === 2) {
    return { name: entries[0], url: entries[1] };
  }
  return { name: "", url: "" };
};

const getiCabTabs = async (): Promise<{ name: string; url: string }[]> => {
  const data = await runAppleScript(`try
    set oldDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to "\`\`\`"
    tell application "iCab"
      set theData to {name, url} of tabs of window 1
      set theData to theData as string
      set AppleScript's text item delimiters to oldDelims
      return theData
    end tell
  end try`);
  const entries = data.split("```");
  const names = entries.slice(0, entries.length / 2);
  const urls = entries.slice(entries.length / 2);
  return names.map((name, i) => ({ name: name, url: urls[i] }));
};

/**
 * Gets the URL of the active tab in a Chromium-based browser.
 *
 * @param browserName The name of the browser.
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getChromiumURL = async (browserName: string): Promise<{ name: string; url: string }> => {
  const data = await runAppleScript(`try
      set oldDelims to AppleScript's text item delimiters
      set AppleScript's text item delimiters to "\`\`\`"
          tell application "${browserName}"
              set tabIndex to active tab index of window 1
              set theData to {title, URL} of tab tabIndex of window 1
              set theData to theData as string
              set AppleScript's text item delimiters to oldDelims
              return theData
          end tell
      end try`);
  const entries = data.split("```");
  if (entries.length === 2) {
    return { name: entries[0], url: entries[1] };
  }
  return { name: "", url: "" };
};

const getChromiumTabs = async (browserName: string): Promise<{ name: string; url: string }[]> => {
  const data = await runAppleScript(`try
    set oldDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to "\`\`\`"
      tell application "${browserName}"
        set theData to {title, URL} of tabs of window 1
        set theData to theData as string
        set AppleScript's text item delimiters to oldDelims
        return theData
      end tell
    end try`);
  const entries = data.split("```");
  const names = entries.slice(0, entries.length / 2);
  const urls = entries.slice(entries.length / 2);
  return names.map((name, i) => ({ name: name, url: urls[i] }));
};

/**
 * The browsers from which the current URL can be obtained.
 */
export const SupportedBrowsers = [
  "Safari",
  "Chromium",
  "Google Chrome",
  "Opera",
  "Opera Neon",
  "Vivaldi",
  "Microsoft Edge",
  "Brave Browser",
  "Iron",
  "Yandex",
  "Blisk",
  "Epic",
  "Arc",
  "iCab",
];

/**
 * Gets the current URL of the active tab of the specified browser.
 *
 * @param browserName The name of the browser application. Must be a member of {@link SupportedBrowsers}.
 * @returns A promise which resolves to the URL of the active tab of the browser as a string.
 */
export const getCurrentURL = async (browserName: string): Promise<{ name: string; url: string }> => {
  switch (browserName) {
    case "Safari":
      return getCurrentSafariURL();
      break;
    case "Google Chrome":
    case "Microsoft Edge":
    case "Brave Browser":
    case "Opera":
    case "Vivaldi":
    case "Chromium":
      return getChromiumURL(browserName);
      break;
    case "Arc":
      return getArcURL();
      break;
    case "iCab":
      return getiCabURL();
      break;
  }
  return { name: "", url: "" };
};

/**
 * Gets the current tabs of the specified browser.
 * @param browserName The name of the browser application. Must be a member of {@link SupportedBrowsers}.
 * @returns A promise which resolves to the tabs of the browser as an array of objects with `name` and `url` properties.
 */
export const getCurrentTabs = async (browserName: string): Promise<{ name: string; url: string }[]> => {
  switch (browserName) {
    case "Safari":
      return getSafariTabs();
      break;
    case "Google Chrome":
    case "Microsoft Edge":
    case "Brave Browser":
    case "Opera":
    case "Vivaldi":
    case "Chromium":
      return getChromiumTabs(browserName);
      break;
    case "Arc":
      return getArcTabs();
      break;
    case "iCab":
      return getiCabTabs();
      break;
  }
  return [];
};
