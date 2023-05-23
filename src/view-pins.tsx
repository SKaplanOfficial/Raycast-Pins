import { useEffect, useRef, useState } from "react";
import {
  Icon,
  Form,
  List,
  useNavigation,
  Action,
  ActionPanel,
  showToast,
  confirmAlert,
  clearSearchBar,
  getPreferenceValues,
  Application,
  getApplications,
} from "@raycast/api";
import { iconMap, setStorage, getStorage, usePins, openPin, checkExpirations } from "./utils";
import { StorageKey } from "./constants";
import { Pin, Group, ExtensionPreferences } from "./types";
import { getFavicon, useCachedState } from "@raycast/utils";
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

const modifyPin = async (
  pin: Pin,
  name: string,
  url: string,
  icon: string,
  group: string,
  application: string,
  expireDate: Date | undefined,
  pop: () => void,
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>
) => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);

  const newData: Pin[] = storedPins.map((oldPin: Pin) => {
    // Update pin if it exists
    if (pin.id != -1 && oldPin.id == pin.id) {
      return {
        name: name,
        url: url,
        icon: icon,
        group: group,
        id: pin.id,
        application: application,
        expireDate: expireDate,
      };
    } else {
      return oldPin;
    }
  });

  if (pin.id == -1) {
    pin.id = (await getStorage(StorageKey.NEXT_PIN_ID))[0];
    while (storedPins.some((storedPin: Pin) => storedPin.id == pin.id)) {
      pin.id = pin.id + 1;
    }
    setStorage(StorageKey.NEXT_PIN_ID, [pin.id + 1]);

    // Add new pin if it doesn't exist
    newData.push({
      name: name,
      url: url,
      icon: icon,
      group: group,
      id: pin.id,
      application: application,
      expireDate: expireDate,
    });
  }

  setPins(newData);
  await setStorage(StorageKey.LOCAL_PINS, newData);
  await showToast({ title: `Updated pin!` });
  pop();
};

const EditPinView = (props: { pin: Pin; setPins: React.Dispatch<React.SetStateAction<Pin[]>> }) => {
  const pin = props.pin;
  const setPins = props.setPins;
  const [url, setURL] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();
  const [applications, setApplications] = useCachedState<Application[]>("applications", []);
  const groups = useGetGroups();
  const { pop } = useNavigation();

  const iconList = Object.keys(Icon);
  iconList.unshift("Favicon / File Icon");
  iconList.unshift("None");

  const preferences = getPreferenceValues<ExtensionPreferences>();

  return (
    <Form
      isLoading={applications.length == 0}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values) =>
              await modifyPin(
                pin,
                values.nameField,
                values.urlField,
                values.iconField,
                values.groupField,
                values.openWithField,
                values.dateField,
                pop,
                setPins
              )
            }
          />
          <Action
            title="Delete Pin"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => {
              deletePin(pin, setPins);
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
        defaultValue={pin.name}
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
        defaultValue={pin.url}
      />

      <Form.Dropdown id="iconField" title="Icon" defaultValue={pin.icon}>
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

      <Form.Dropdown
        title="Open With"
        id="openWithField"
        info="The application to open the pin with"
        defaultValue={pin.application}
      >
        <Form.Dropdown.Item key="None" title="None" value="None" icon={Icon.Minus} />
        {applications.map((app) => {
          return <Form.Dropdown.Item key={app.name} title={app.name} value={app.name} icon={{ fileIcon: app.path }} />;
        })}
      </Form.Dropdown>

      <Form.DatePicker
        id="dateField"
        title="Expiration Date"
        info="The date and time at which the pin will be automatically removed"
        defaultValue={pin.expireDate}
      />

      {groups.length > 0 ? (
        <Form.Dropdown id="groupField" title="Group" defaultValue={pin.group}>
          {groups.map((group) => {
            return (
              <Form.Dropdown.Item key={group.id} title={group.name} value={group.name} icon={iconMap[group.icon]} />
            );
          })}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
};

const deletePin = async (pin: Pin, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) => {
  if (await confirmAlert({ title: "Are you sure?" })) {
    const storedPins = await getStorage(StorageKey.LOCAL_PINS);

    const filteredPins = storedPins.filter((oldPin: Pin) => {
      return oldPin.id != pin.id;
    });

    setPins(filteredPins);
    await setStorage(StorageKey.LOCAL_PINS, filteredPins);
    await showToast({ title: `Removed pin!` });
  }
};

const movePinUp = async (index: number, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) => {
  const storedPins: Pin[] = await getStorage(StorageKey.LOCAL_PINS);
  const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
  const preferences = getPreferenceValues<ExtensionPreferences & CommandPreferences>();
  if (preferences.showGroups) {
    // Move pin up within its group
    const otherGroup = { name: "Other", icon: "Minus", id: -1 };
    const pinsSortedByGroup = storedGroups.concat(otherGroup).reduce((acc, current) => {
      const groupPins = storedPins.filter(
        (pin) => pin.group == current.name || (pin.group == "None" && current.name == "Other")
      );
      if (groupPins.length > index) {
        [groupPins[index - 1], groupPins[index]] = [groupPins[index], groupPins[index - 1]];
      }
      return [...acc, ...groupPins];
    }, [] as Pin[]);
    setPins(pinsSortedByGroup);
    await setStorage(StorageKey.LOCAL_PINS, pinsSortedByGroup);
  } else {
    // Move pin up in overall list
    if (storedPins.length > index) {
      [storedPins[index - 1], storedPins[index]] = [storedPins[index], storedPins[index - 1]];
      setPins(storedPins);
      await setStorage(StorageKey.LOCAL_PINS, storedPins);
    }
  }
};

const movePinDown = async (index: number, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) => {
  const storedPins: Pin[] = await getStorage(StorageKey.LOCAL_PINS);
  const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
  const preferences = getPreferenceValues<ExtensionPreferences & CommandPreferences>();
  if (preferences.showGroups) {
    // Move pin down within its group
    const otherGroup = { name: "Other", icon: "Minus", id: -1 };
    const pinsSortedByGroup = storedGroups.concat(otherGroup).reduce((acc, current) => {
      const groupPins = storedPins.filter(
        (pin) => pin.group == current.name || (pin.group == "None" && current.name == "Other")
      );
      if (groupPins.length > index + 1) {
        [groupPins[index], groupPins[index + 1]] = [groupPins[index + 1], groupPins[index]];
      }
      return [...acc, ...groupPins];
    }, [] as Pin[]);
    setPins(pinsSortedByGroup);
    await setStorage(StorageKey.LOCAL_PINS, pinsSortedByGroup);
  } else {
    // Move pin down in overall list
    if (storedPins.length > index + 1) {
      [storedPins[index], storedPins[index + 1]] = [storedPins[index + 1], storedPins[index]];
      setPins(storedPins);
      await setStorage(StorageKey.LOCAL_PINS, storedPins);
    }
  }
};

const CreateNewPinAction = (props: { setPins: React.Dispatch<React.SetStateAction<Pin[]>> }) => {
  const { setPins } = props;
  return (
    <Action.Push
      title="Create New Pin"
      icon={Icon.PlusCircle}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={
        <EditPinView
          pin={{
            name: "",
            url: "",
            icon: "None",
            group: "None",
            id: -1,
            application: "None",
            expireDate: undefined,
          }}
          setPins={setPins}
        />
      }
    />
  );
};

interface CommandPreferences {
  showGroups: boolean;
}

export default function Command() {
  const { pins, setPins, isLoading } = usePins();
  const groups = useGetGroups();
  const preferences = getPreferenceValues<ExtensionPreferences & CommandPreferences>();

  useEffect(() => {
    Promise.resolve(checkExpirations());
  });

  const getPinListItems = (pins: Pin[]) => {
    return pins.map((pin, index) => (
      <List.Item
        title={pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}
        subtitle={pin.group != "None" ? pin.group : ""}
        key={pin.id}
        icon={
          pin.icon in iconMap
            ? iconMap[pin.icon]
            : pin.icon == "None"
            ? Icon.Minus
            : pin.url.startsWith("/") || pin.url.startsWith("~")
            ? { fileIcon: pin.url }
            : pin.url.match(/.*?:.*/g)
            ? getFavicon(pin.url)
            : Icon.Terminal
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Pin Actions">
              <Action title="Open" icon={Icon.ChevronRight} onAction={() => openPin(pin, preferences)} />
              <Action.Push
                title="Edit"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditPinView pin={pin} setPins={setPins} />}
              />
              <Action.Push
                title="Duplicate"
                icon={Icon.EyeDropper}
                shortcut={{ modifiers: ["cmd", "ctrl"], key: "d" }}
                target={<EditPinView pin={{ ...pin, name: pin.name + " Copy" }} setPins={setPins} />}
              />

              {index > 0 ? (
                <Action
                  title="Move Up"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                  onAction={async () => {
                    await movePinUp(index, setPins);
                  }}
                />
              ) : null}
              {index < pins.length - 1 ? (
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={async () => {
                    await movePinDown(index, setPins);
                  }}
                />
              ) : null}

              <Action
                title="Delete Pin"
                icon={Icon.Trash}
                onAction={() => {
                  deletePin(pin, setPins);
                  clearSearchBar();
                }}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                style={Action.Style.Destructive}
              />
            </ActionPanel.Section>
            <CreateNewPinAction setPins={setPins} />
          </ActionPanel>
        }
      />
    ));
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search pins..."
      actions={<ActionPanel>{<CreateNewPinAction setPins={setPins} />}</ActionPanel>}
    >
      <List.EmptyView title="No Pins Found" icon="no-view.png" />
      {preferences.showGroups
        ? groups.map((group) => (
            <List.Section title={group.name == "None" ? "Other" : group.name} key={group.id}>
              {getPinListItems(pins.filter((pin) => pin.group == group.name))}
            </List.Section>
          ))
        : getPinListItems(pins)}
    </List>
  );
}
