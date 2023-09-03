/**
 * @file components/PinForm.tsx General form for creating and editing pins.
 *
 * @summary Form for creating and editing pins.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-03 12:46:49
 * Last modified  : 2023-09-03 12:47:36
 */

import * as os from "os";
import path from "path";
import { useState } from "react";

import {
  Action,
  ActionPanel,
  Application,
  environment,
  Form,
  getApplications,
  getPreferenceValues,
  Icon,
  showToast,
  useNavigation,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";

import { KEYBOARD_SHORTCUT } from "../lib/constants";
import { useGroups } from "../lib/Groups";
import { iconMap } from "../lib/icons";
import { createNewPin, deletePin, getPins, modifyPin, Pin } from "../lib/Pins";
import { ExtensionPreferences } from "../lib/utils";

/**
 * Form view for creating/editing a new pin.
 * @returns A form view.
 */

export const PinForm = (props: { pin?: Pin; setPins?: React.Dispatch<React.SetStateAction<Pin[]>> }) => {
  const { pin, setPins } = props;
  const [url, setURL] = useState<string | undefined>(pin ? pin.url : undefined);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [shortcutError, setShortcutError] = useState<string | undefined>();
  const [isFragment, setIsFragment] = useState<boolean>(pin && pin.fragment ? true : false);
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
              const shortcut = { modifiers: values.modifiersField, key: values.keyField };

              const reservedShortcut = Object.entries(KEYBOARD_SHORTCUT).find(
                ([, reservedShortcut]) =>
                  reservedShortcut.modifiers.every((modifier) => shortcut.modifiers.includes(modifier)) &&
                  reservedShortcut.key == shortcut.key
              );
              if (reservedShortcut) {
                setShortcutError(`This shortcut is reserved by the extension! (${reservedShortcut[0]})`);
                return false;
              }
              setShortcutError(undefined);

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
                  { modifiers: values.modifiersField, key: values.keyField },
                  pin.lastOpened ? new Date(pin.lastOpened) : undefined,
                  pin.timesOpened,
                  pin.dateCreated ? new Date(pin.dateCreated) : undefined,
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
                  values.fragmentField,
                  { modifiers: values.modifiersField, key: values.keyField }
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
        <Form.Dropdown
          title="Open With"
          id="openWithField"
          info="The application to open the pin with"
          defaultValue={pin ? pin.application : undefined}
        >
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

      <Form.Separator />

      <Form.TagPicker
        id="modifiersField"
        title="Keyboard Shortcut Modifiers"
        defaultValue={pin ? pin.shortcut?.modifiers : undefined}
        error={shortcutError}
      >
        <Form.TagPicker.Item key="cmd" title="Command" value="cmd" />
        <Form.TagPicker.Item key="shift" title="Shift" value="shift" />
        <Form.TagPicker.Item key="ctrl" title="Control" value="ctrl" />
        <Form.TagPicker.Item key="alt" title="Option" value="alt" />
      </Form.TagPicker>

      <Form.TextField
        id="keyField"
        title="Keyboard Shortcut Key"
        defaultValue={pin ? pin.shortcut?.key : undefined}
        error={shortcutError}
      />
    </Form>
  );
};
