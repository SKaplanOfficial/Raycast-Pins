import { useState, useEffect } from "react";
import {
  Form,
  Icon,
  ActionPanel,
  Action,
  showToast,
  useNavigation,
  getApplications,
  Application,
  getPreferenceValues,
} from "@raycast/api";
import { iconMap, getStorage, createNewPin } from "./utils";
import { StorageKey } from "./constants";
import { ExtensionPreferences, Group } from "./types";
import { getFavicon } from "@raycast/utils";
import * as os from "os";

const useGetGroups = () => {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    Promise.resolve(getStorage(StorageKey.LOCAL_GROUPS)).then((groups) => {
      const allGroups = [...groups];
      allGroups.push({
        name: "None",
        id: -1,
        icon: "Minus",
      });
      setGroups(allGroups);
    });
  }, []);

  return groups;
};

const NewPinForm = () => {
  const [url, setURL] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();
  const [applications, setApplications] = useState<Application[]>([]);

  const groups = useGetGroups();
  const iconList = Object.keys(Icon);
  iconList.unshift("Favicon / File Icon");
  iconList.unshift("None");

  const { pop } = useNavigation();

  const preferences = getPreferenceValues<ExtensionPreferences>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={async (values) => {
              await createNewPin(
                values.nameField,
                values.urlField,
                values.iconField,
                values.groupField,
                values.openWithField,
                values.dateField
              );
              await showToast({ title: `Added pin for "${values.nameField}"` });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Pin Name"
        placeholder="Enter pin name, e.g. Google, or leave blank to use URL"
      />

      <Form.TextField
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
            if (value.match(/.*?:.*/g)) {
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
      />

      <Form.Dropdown id="iconField" title="Icon" defaultValue="None">
        {iconList.map((icon) => {
          const urlIcon = url
            ? url.startsWith("/") || url.startsWith("~")
              ? { fileIcon: url }
              : url.match(/.*?:.*/g)
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

      <Form.Dropdown title="Open With" id="openWithField" info="The application to open the pin with">
        <Form.Dropdown.Item key="None" title="None" value="None" icon={Icon.Minus} />
        {applications.map((app) => {
          return <Form.Dropdown.Item key={app.name} title={app.name} value={app.name} icon={{ fileIcon: app.path }} />;
        })}
      </Form.Dropdown>

      <Form.DatePicker
        id="dateField"
        title="Expiration Date"
        info="The date and time at which the pin will be automatically removed"
      />

      {groups?.length ? (
        <Form.Dropdown id="groupField" title="Group" defaultValue="None">
          {groups.map((group) => {
            return (
              <Form.Dropdown.Item key={group.name} title={group.name} value={group.name} icon={iconMap[group.icon]} />
            );
          })}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
};

export default function Command() {
  return <NewPinForm />;
}
