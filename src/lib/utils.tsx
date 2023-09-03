import { LocalStorage, Icon, Clipboard, showToast, Toast, useNavigation, Application, getPreferenceValues, Form, ActionPanel, Action, environment, getApplications, showHUD } from "@raycast/api";
import { exec, execSync } from "child_process";
import { StorageKey } from "./constants";
import { getFavicon, runAppleScript } from "@raycast/utils";
import { Pin, createNewPin, deletePin, getPins, modifyPin } from "./Pins";
import { Group, useGroups } from "./Groups";
import { useState } from "react";
import path from "path";
import * as os from "os";
import { Placeholders } from "./placeholders";

/**
 * Preferences for the entire extension.
 */
export interface ExtensionPreferences {
  /**
   * The user's preferred browser. This is used to open URL pins.
   */
  preferredBrowser: string;

  /**
   * The first section displayed in lists of pins, e.g. grouped-pins-first or ungrouped-pins-first.
   */
  topSection: string;

  /**
   * Whether or not to show the recent applications section in lists of pins.
   */
  showRecentApplications: boolean;
}

/**
 * A map of icon names to icon objects.
 */
export const iconMap: { [index: string]: Icon } = Icon;

/**
 * Sets the value of a local storage key.
 * @param key The key to set the value of.
 * @param value The string value to set the key to.
 */
export const setStorage = async (key: string, value: unknown) => {
  await LocalStorage.setItem(key, JSON.stringify(value));
};

/**
 * Gets the value of a local storage key.
 * @param key The key to get the value of.
 * @returns The JSON-parsed value of the key.
 */
export const getStorage = async (key: string) => {
  const localStorage = await LocalStorage.getItem<string>(key);
  const storageString = typeof localStorage === "undefined" ? "" : localStorage;
  return storageString == "" ? [] : JSON.parse(storageString);
};

/**
 * Runs a terminal command asynchronously.
 * @param command The command to run.
 * @param callback A callback function to run on each line of output.
 */
export const runCommand = async (command: string, callback?: (arg0: string) => unknown) => {
  const child = exec(command);
  let result = "";

  child.stdout?.on("data", (data: string) => {
    result = result + data;
    callback?.(result);
  });

  while (child.stdout?.readable) {
    await new Promise((r) => setTimeout(r, 100));
  }

  return result;
};

/**
 * Runs a terminal command synchronously.
 * @param command The command to run.
 * @returns The result of the command as a string.
 */
export const runCommandSync = (command: string) => {
  const result = execSync(command);
  return result.toString();
};

/**
 * Runs Terminal command in a new Terminal tab.
 * @param command The command to run.
 * @returns A promise resolving to the output of the command as a string.
 */
export const runCommandInTerminal = async (command: string): Promise<string> => {
  const output = await runAppleScript(`tell application "Terminal"
    try
      activate
      do script "${command.replaceAll('"', '\\"')}"
    end try
  end tell`);
  return output;
};

/**
 * Copies the pin data to the clipboard.
 * @returns A promise resolving to the JSON string of the pin data.
 */
export const copyPinData = async () => {
  const pins = await getStorage(StorageKey.LOCAL_PINS);
  const groups = await getStorage(StorageKey.LOCAL_GROUPS);

  const data = {
    groups: groups,
    pins: pins,
  };

  const jsonData = JSON.stringify(data);
  await Clipboard.copy(jsonData);
  return jsonData;
};

/**
 * Converts a vague icon reference to an icon object.
 * @param iconRef The icon reference to convert.
 * @returns The icon object.
 */
export const getIcon = (iconRef: string) => {
  if (iconRef in iconMap) {
    return iconMap[iconRef];
  } else if (iconRef.startsWith("/") || iconRef.startsWith("~")) {
    return { fileIcon: iconRef };
  } else if (iconRef.match(/^[a-zA-Z0-9]*?:.*/g)) {
    return getFavicon(iconRef);
  } else if (iconRef == "None") {
    return "";
  }
  return Icon.Terminal;
};

/**
 * Imports default pins and groups into local storage.
 */
export const installExamples = async () => {
  const examplePins: Pin[] = [
    {
      id: 1,
      name: "Google",
      url: "https://google.com",
      icon: "Favicon / File Icon",
      group: "None",
      application: "None",
    },
    {
      id: 2,
      name: "GitHub",
      url: "https://github.com",
      icon: "Favicon / File Icon",
      group: "Dev Utils",
      application: "None",
    },
    {
      id: 3,
      name: "Regex 101",
      url: "https://regex101.com",
      icon: "Favicon / File Icon",
      group: "Dev Utils",
      application: "None",
    },
    {
      id: 4,
      name: "Terminal",
      url: "/System/Applications/Utilities/Terminal.app",
      icon: "Favicon / File Icon",
      group: "Dev Utils",
      application: "None",
    },
    {
      id: 5,
      name: "New Folder Here",
      url: `osascript -e 'tell application "Finder"' -e 'set dirPath to folder (POSIX file "{{currentDirectory}}" as alias)' -e 'set newFolder to make new folder at dirPath' -e 'select newFolder' -e 'end tell'`,
      icon: "NewFolder",
      group: "Scripts",
      application: "None",
      execInBackground: true,
    },
    {
      id: 6,
      name: "New File Here",
      url: `osascript -e 'tell application "Finder"' -e 'set dirPath to folder (POSIX file "{{currentDirectory}}" as alias)' -e 'set newFile to make new file at dirPath' -e 'select newFile' -e 'end tell'`,
      icon: "NewDocument",
      group: "Scripts",
      application: "None",
      execInBackground: true,
    },
    {
      id: 7,
      name: "New Terminal Here",
      url: `cd {{currentDirectory}}`,
      icon: "Terminal",
      group: "Scripts",
      application: "None",
    },
    {
      id: 8,
      name: "ChatGPT",
      url: "https://chat.openai.com",
      icon: "Favicon / File Icon",
      group: "None",
      application: "None",
    },
    {
      id: 9,
      name: "Random Duck",
      url: "https://random-d.uk",
      icon: "Favicon / File Icon",
      group: "None",
      application: "None",
    },
    {
      id: 10,
      name: "Search On Google",
      url: "https://www.google.com/search?q={{selectedText}}",
      icon: "Favicon / File Icon",
      group: "None",
      application: "None",
    },
  ];

  const exampleGroups: Group[] = [
    {
      id: 1,
      name: "Dev Utils",
      icon: "CodeBlock",
    },
    {
      id: 2,
      name: "Scripts",
      icon: "Text",
    },
  ];

  await setStorage(StorageKey.LOCAL_PINS, examplePins);
  await setStorage(StorageKey.LOCAL_GROUPS, exampleGroups);
  await LocalStorage.setItem(StorageKey.EXAMPLES_INSTALLED, true);
  await showToast({ title: "Examples Installed!", style: Toast.Style.Success });
};

/**
 * Form view for creating/editing a new pin.
 * @returns A form view.
 */
export const PinForm = (props: { pin?: Pin; setPins?: React.Dispatch<React.SetStateAction<Pin[]>> }) => {
  const { pin, setPins } = props;
  const [url, setURL] = useState<string | undefined>(pin ? pin.url : undefined);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [isFragment, setIsFragment] = useState<boolean>(pin &&  pin.fragment ? true : false);
  const [applications, setApplications] = useState<Application[]>([]);
  const { groups } = useGroups();
  const { pop } = useNavigation();

  const iconList = Object.keys(Icon);
  iconList.unshift("Favicon / File Icon");
  iconList.unshift("None");

  const preferences = getPreferenceValues<ExtensionPreferences>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={async (values) => {
              if (pin && setPins) {
                await modifyPin(
                  pin,
                  values.nameField,
                  values.urlField,
                  values.iconField,
                  values.groupField,
                  values.openWithField,
                  values.dateField,
                  values.execInBackgroundField,
                  values.fragmentField,
                  pop,
                  setPins
                );
              } else {
                await createNewPin(
                  values.nameField || values.urlField.substring(0, 50),
                  values.urlField,
                  values.iconField,
                  values.groupField || "None",
                  values.openWithField,
                  values.dateField,
                  values.execInBackgroundField,
                  values.fragmentField
                );
                if (setPins) {
                  setPins(await getPins());
                }
                await showToast({ title: `Added pin for "${values.nameField}"` });
                pop();
              }
            }}
          />
          <Action.Open
            title="Open Placeholders Guide"
            icon={Icon.Info}
            target={path.resolve(environment.assetsPath, "placeholders_guide.txt")}
            application="TextEdit"
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          {pin && setPins ? (
            <Action
              title="Delete Pin"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                await deletePin(pin, setPins);
                pop();
              }}
            />
          ) : null}
          <Action.Open
            title="Open Placeholders Guide"
            icon={Icon.Info}
            target={path.resolve(environment.assetsPath, "placeholders_guide.md")}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Pin Name"
        placeholder="Enter pin name, e.g. Google, or leave blank to use target"
        info="The name of the pin as it will appear in the list/menu. If left blank, the first 50 characters of the target (prior to placeholder substitution) will be used as the name."
        defaultValue={pin ? pin.name : undefined}
      />

      <Form.TextArea
        id="urlField"
        title="Target"
        placeholder="Enter the filepath, URL, or Terminal command to pin"
        error={urlError}
        onChange={async (value) => {
          setURL(value);
          if (value.startsWith("~")) {
            value = value.replace("~", os.homedir());
          }

          try {
            setApplications(await getApplications(value));
          } catch (error) {
            const allApplications = await getApplications();
            if (value.match(/^[a-zA-Z0-9]*?:.*/g)) {
              const preferredBrowser = preferences.preferredBrowser ? preferences.preferredBrowser : "Safari";
              const browser = allApplications.find((app) => app.name == preferredBrowser);
              if (browser) {
                setApplications([browser, ...allApplications.filter((app) => app.name != preferredBrowser)]);
              }
            } else {
              setApplications(allApplications);
            }
          }

          if (urlError !== undefined) {
            setUrlError(undefined);
          } else {
            null;
          }
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError("URL cannot be empty!");
          } else if (urlError !== undefined) {
            setUrlError(undefined);
          }
        }}
        defaultValue={pin ? pin.url : undefined}
      />

      <Form.Checkbox
        label="Treat as Text Fragment"
        id="fragmentField"
        info="If checked, the target will be treated as a text fragment, regardless of its format. Text fragments are copied to the clipboard when the pin is opened."
        onChange={(value) => {
          setIsFragment(value);
        }}
        defaultValue={pin ? pin.fragment : false}
      />

      {!isFragment && !url?.startsWith("/") && !url?.startsWith("~") && !url?.match(/^[a-zA-Z0-9]*?:.*/g) ? (
        <Form.Checkbox
          label="Execute in Background"
          id="execInBackgroundField"
          defaultValue={pin ? pin.execInBackground : false}
          info="If checked, the pinned Terminal command will be executed in the background instead of in a new Terminal tab."
        />
      ) : null}

      <Form.Dropdown id="iconField" title="Icon" defaultValue={pin ? pin.icon : "Favicon / File Icon"}>
        {iconList.map((icon) => {
          const urlIcon = url
            ? url.startsWith("/") || url.startsWith("~")
              ? { fileIcon: url }
              : url.match(/^[a-zA-Z0-9]*?:.*/g)
              ? getFavicon(url)
              : Icon.Terminal
            : iconMap["Minus"];

          return (
            <Form.Dropdown.Item
              key={icon}
              title={icon}
              value={icon}
              icon={icon in iconMap ? iconMap[icon] : icon == "Favicon / File Icon" ? urlIcon : iconMap["Minus"]}
            />
          );
        })}
      </Form.Dropdown>

      {!isFragment ? (
        <Form.Dropdown title="Open With" id="openWithField" info="The application to open the pin with" defaultValue={pin ? pin.application : undefined}>
          <Form.Dropdown.Item key="None" title="None" value="None" icon={Icon.Minus} />
          {applications.map((app) => {
            return (
              <Form.Dropdown.Item key={app.name} title={app.name} value={app.path} icon={{ fileIcon: app.path }} />
            );
          })}
        </Form.Dropdown>
      ) : null}

      <Form.DatePicker
        id="dateField"
        title="Expiration Date"
        info="The date and time at which the pin will be automatically removed"
        defaultValue={pin && pin.expireDate ? new Date(pin.expireDate) : undefined}
      />

      {groups?.length ? (
        <Form.Dropdown id="groupField" title="Group" defaultValue={pin ? pin.group : "None"}>
          {[{ name: "None", icon: "Minus", id: -1 }].concat(groups).map((group) => {
            return (
              <Form.Dropdown.Item key={group.name} title={group.name} value={group.name} icon={iconMap[group.icon]} />
            );
          })}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
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
  const vars: PersistentVariable[] = await getStorage(StorageKey.PERSISTENT_VARS)
  const variable = vars.find((variable) => variable.name == name);
  if (variable) {
    return variable.value;
  }
  return "";
}

/**
 * Sets the value of a persistent variable in the extension's persistent local storage. If the variable does not exist, it will be created. The most recently set variable will be always be placed at the end of the list.
 * @param name The name of the variable to set.
 * @param value The initial value of the variable.
 */
export const setPersistentVariable = async (name: string, value: string) => {
  const vars: PersistentVariable[] = await getStorage(StorageKey.PERSISTENT_VARS)
  const variable = vars.find((variable) => variable.name == name);
  if (variable) {
    vars.splice(vars.indexOf(variable), 1);
    variable.value = value;
    vars.push(variable);
  } else {
    vars.push({ name: name, value: value, initialValue: value });
  }
  await setStorage(StorageKey.PERSISTENT_VARS, vars);
}

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
}

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
}

/**
 * A scheduled execution of a placeholder. These are stored in the extension's persistent local storage.
 */
export interface DelayedExecution {
  target: string;
  dueDate: Date;
}

/**
 * Schedules content to be evaluated by the placeholder system at a later date.
 * @param target The content to evaluate.
 * @param dueDate The date and time at which the content should be evaluated.
 */
export const scheduleTargetEvaluation = async (target: string, dueDate: Date) => {
  const delayedExecutions = await getStorage(StorageKey.DELAYED_EXECUTIONS);
  delayedExecutions.push({ target: target, dueDate: dueDate });
  await setStorage(StorageKey.DELAYED_EXECUTIONS, delayedExecutions);
  
  if (environment.commandName == "index") {
    await showHUD("Scheduled Delayed Evaluation")
  } else {
    await showToast({ title: "Scheduled Delayed Evaluation", primaryAction: { title: "Cancel", onAction: async () => {
      await removedScheduledEvaluation(target, dueDate)
      await showToast({ title: "Canceled Delayed Evaluation" })
    } } });
  }
}

/**
 * Cancels a schedules evaluation, removing it from the extension's persistent local storage.
 * @param target The content of the evaluation to cancel.
 * @param dueDate The date and time at which the evaluation was scheduled to occur.
 */
export const removedScheduledEvaluation = async (target: string, dueDate: Date) => {
  const delayedExecutions: { target: string; dueDate: string }[] = await getStorage(StorageKey.DELAYED_EXECUTIONS);
  await setStorage(StorageKey.DELAYED_EXECUTIONS, delayedExecutions.filter((execution) => execution.target != target && new Date(execution.dueDate) != dueDate));
}

/**
 * Checks if any scheduled executions are due to be evaluated, and evaluates them if they are.
 */
export const checkDelayedExecutions = async () => {
  const delayedExecutions: { target: string; dueDate: string }[] = await getStorage(StorageKey.DELAYED_EXECUTIONS);
  const now = new Date();
  for (const execution of delayedExecutions) {
    if (new Date(execution.dueDate) <= now) {
      await Placeholders.applyToString(execution.target);
    }
  }
  await setStorage(StorageKey.DELAYED_EXECUTIONS, delayedExecutions.filter((execution) => new Date(execution.dueDate) > now));
}
