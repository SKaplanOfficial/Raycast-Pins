import * as fs from "fs";
import Papa from "papaparse";
import path from "path";
import { useState } from "react";
import * as XML from "xml-js";
import YAML from "yaml";

import * as TOML from "@iarna/toml";
import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";

import { StorageKey, SORT_STRATEGY, Visibility } from "./lib/common";
import { buildGroup, getGroups, Group, validateGroups } from "./lib/Groups";
import { buildPin, getPins, Pin } from "./lib/pin";
import { setStorage } from "./lib/storage";
import { GroupDisplaySetting } from "./lib/preferences";

/**
 * Merges the existing pins/groups with the imported pins/groups, removing any duplicate entries. Duplicate entries are determined by the name of the pin. The ID of each pin is updated to ensure that there are no duplicates.
 * @param dataItems The pins/groups to be imported.
 * @param oldItems The existing pins/groups.
 * @returns The merged list of pins/groups.
 */
const mergeRemovingDuplicates = async (
  dataItems: { name: string; id: string }[],
  oldItems: { name: string; id: string }[],
) => {
  const newItems = [...oldItems];
  dataItems.forEach((dataItem) => {
    let found = false;
    oldItems.forEach((oldItem) => {
      if (dataItem.name == oldItem.name) {
        found = true;
      }
    });

    if (!found) {
      newItems.push(dataItem);
    }
  });
};

/**
 * Imports pins and pin groups from JSON-parsed data.
 * @param data The JSON-parsed data to import.
 * @param importMethod The method to use when importing the data, e.g. Merge1 (maintain duplicates), Merge2 (remove duplicates), or Replace (replace all existing data).
 */
const importJSONData = async (data: { groups?: Group[]; pins?: Pin[] }, importMethod: string) => {
  if (importMethod == "Merge1") {
    // Maintain duplicates
    // Update groups
    const oldGroups = await getGroups();
    const newGroups = oldGroups.concat(data.groups || []);
    await validateGroups(newGroups);
    // TODO: use context
    await setStorage(StorageKey.LOCAL_GROUPS, newGroups);

    // Update pins
    const oldPins = await getPins();
    const newPins = oldPins.concat(data.pins || []);
    await setStorage(StorageKey.LOCAL_PINS, newPins);
    showToast({ title: "Merged Pin data!" });
  } else if (importMethod == "Merge2") {
    // Remove duplicates
    // Remove group duplicates
    const dataGroups = data.groups;
    const oldGroups = await getGroups();
    const newGroups = await mergeRemovingDuplicates(dataGroups || [], oldGroups);
    await setStorage(StorageKey.LOCAL_GROUPS, newGroups);

    // Remove pin duplicates
    const dataPins = data.pins || [];
    const oldPins = await getPins();
    const newPins = await mergeRemovingDuplicates(dataPins, oldPins);
    await setStorage(StorageKey.LOCAL_PINS, newPins);

    showToast({ title: "Updated Pin data!" });
  } else if (importMethod == "Replace") {
    // Replace all groups and pins
    if (data.pins) {
      await setStorage(StorageKey.LOCAL_PINS, data.pins);
    }

    if (data.groups) {
      await setStorage(StorageKey.LOCAL_GROUPS, data.groups);
    }

    showToast({ title: "Replaced Pin data!" });
  }
  popToRoot();
};

/**
 * Imports Pins and Groups from CSV data.
 * @param data The CSV data to import.
 * @param importMethod The merge method to use to resolve duplicate entry conflicts.
 */
const importCSVData = async (data: string[][], importMethod: string) => {
  const fieldNames = data[0];
  if (fieldNames.includes("url")) {
    // The file contains Pin data
    const newPins: Pin[] = data.slice(1).map((row) => {
      const indices = Object.fromEntries(fieldNames.map((name, index) => [name, index]));
      return buildPin({
        name: row[indices.name],
        url: row[indices.url],
        group: indices.group == -1 ? undefined : row[indices.group],
        icon: indices.icon == -1 ? undefined : row[indices.icon],
        application: indices.application == -1 ? "None" : row[indices.application],
        expireDate: indices.expireDate == -1 ? undefined : row[indices.expireDate],
        fragment: indices.fragment == -1 ? undefined : row[indices.fragment] == "true",
        lastOpened: indices.lastOpened == -1 ? undefined : row[indices.lastOpened],
        timesOpened: indices.timesOpened == -1 ? undefined : parseInt(row[indices.timesOpened]),
        dateCreated: indices.dateCreated == -1 ? undefined : row[indices.dateCreated],
        iconColor: indices.iconColor == -1 ? undefined : row[indices.iconColor],
        tags:
          indices.tags == -1
            ? undefined
            : row[indices.tags]
                .split(",")
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0),
        notes: indices.notes == -1 ? undefined : row[indices.notes],
        tooltip: indices.tooltip == -1 ? undefined : row[indices.tooltip],
        averageExecutionTime:
          indices.averageExecutionTime == -1 ? undefined : parseInt(row[indices.averageExecutionTime]),
        visibility:
          indices.visibility == -1 ? undefined : (row[indices.visibility] as Visibility) || Visibility.VISIBLE,
        expirationAction: indices.expirationAction == -1 ? undefined : row[indices.expirationAction],
        aliases:
          indices.aliases == -1
            ? undefined
            : row[indices.aliases]
                .split(",")
                .map((alias) => alias.trim())
                .filter((alias) => alias.length > 0),
      });
    });
    await importJSONData({ pins: newPins }, importMethod);
  } else {
    // The file contains Group data
    const indices = Object.fromEntries(
      fieldNames.map((name, index) => {
        return [name, index];
      }),
    );

    // Update number-based IDs to string-based IDs
    const oldGroupRelatives = data.slice(1).map((row) => ({
      name: row[indices.name],
      oldID: row[indices.id],
      parent: indices.parent == -1 ? undefined : row[indices.parent],
    }));

    const newGroupRelatives = oldGroupRelatives.reduce(
      (acc, group) => {
        const parentGroup = oldGroupRelatives.find((g) => g.name == group.parent?.toString());
        if (parentGroup) {
          acc[group.name] = parentGroup.name;
        }
        return acc;
      },
      {} as { [key: string]: string },
    );

    const newGroups: Group[] = data.slice(1).map((row) => {
      return buildGroup({
        name: row[indices.name],
        icon: row[indices.icon],
        iconColor: indices.iconColor == -1 ? undefined : row[indices.iconColor],
        parent: newGroupRelatives[row[indices.name]],
        sortStrategy:
          indices.sortStrategy == -1
            ? undefined
            : (row[indices.sortStrategy] as (typeof SORT_STRATEGY)[keyof typeof SORT_STRATEGY]) || SORT_STRATEGY.MANUAL,
        visibility:
          indices.visibility == -1 ? undefined : (row[indices.visibility] as Visibility) || Visibility.VISIBLE,
        menubarDisplay:
          indices.menubarDisplay == -1
            ? undefined
            : (row[indices.menubarDisplay] as GroupDisplaySetting) || GroupDisplaySetting.USE_PARENT,
      });
    });
    await importJSONData({ groups: newGroups }, importMethod);
  }
};

/**
 * Imports Pins and Groups from XML data.
 * @param data The XML data to import.
 * @param importMethod The merge method to use to resolve duplicate entry conflicts.
 */
const importXMLData = async (
  data: { groups?: XML.ElementCompact[]; pins?: XML.ElementCompact[] },
  importMethod: string,
) => {
  const dataWrapper = {
    pins: data.pins?.map(
      (pin) =>
        Object.fromEntries(
          Object.entries(pin).map(([key, value]) => {
            return [key, value._text];
          }),
        ) as Pin,
    ),
    groups: data.groups?.map(
      (group) =>
        Object.fromEntries(
          Object.entries(group).map(([key, value]) => {
            return [key, value._text];
          }),
        ) as Group,
    ),
  };
  await importJSONData(dataWrapper, importMethod);
};

/**
 * Imports Pins and Groups from a file (generally one previously exported from this extension). Supports JSON, CSV, TOML, YAML, and XML files.
 * @param file The file to import from.
 * @param importMethod The merge method to use to resolve duplicate entry conflicts.
 */
const importDataFromFile = async (file: string, importMethod: string) => {
  const fileExtension = path.extname(file);
  const rawData = fs.readFileSync(file).toString().replaceAll("]]]", "}}").replaceAll("[[[", "{{");
  if (fileExtension == ".json") {
    const data = JSON.parse(rawData.toString());
    await importJSONData(data, importMethod);
  } else if (fileExtension == ".csv") {
    const data = Papa.parse(rawData).data as string[][];
    await importCSVData(data, importMethod);
  } else if (fileExtension == ".toml") {
    const data = TOML.parse(rawData);
    await importJSONData(data, importMethod);
  } else if (fileExtension == ".yaml") {
    const data = YAML.parse(rawData);
    await importJSONData(data, importMethod);
  } else if (fileExtension == ".xml") {
    const data = (
      XML.xml2js(rawData, { compact: true }) as {
        data: { pins?: XML.ElementCompact[]; groups?: XML.ElementCompact[] };
      }
    ).data;
    await importXMLData(data, importMethod);
  }
};

/**
 * Checks if the JSON string is properly formatted. If not, displays an error message.
 * @param jsonString The JSON string to check.
 * @param setJSONError The function to call to set the error message.
 */
const checkJSONFormat = (jsonString: string, setJSONError: (error: string | undefined) => void) => {
  let error = null;
  try {
    const data = JSON.parse(jsonString);
    if (!("groups" in data)) {
      error = "Group data missing from JSON string!";
    }

    if (!("pins" in data)) {
      error = "Pin data missing from JSON string!";
    }
  } catch {
    error = "Please enter a valid JSON string!";
  }

  if (error) {
    setJSONError(error);
  } else {
    setJSONError(undefined);
  }
};

const checkFileValidity = (file: string, setFileError: (error: string | undefined) => void) => {
  let error = undefined;
  const fileExtension = path.extname(file);
  const acceptedFileExtensions = [".json", ".csv", ".toml", ".yaml", ".xml"];
  if (!acceptedFileExtensions.includes(fileExtension)) {
    error = "Invalid File Type";
  }

  setFileError(error);
};

/**
 * Form view for importing pin data from a JSON string.
 * @returns A form view.
 */
const ImportDataForm = () => {
  const [jsonContent, setJSONContent] = useState<string | undefined>();
  const [selectedFiles, setSelectedFiles] = useState<string[] | undefined>();
  const [jsonError, setJSONError] = useState<string | undefined>();
  const [fileError, setFileError] = useState<string | undefined>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={async (values) => {
              if (values.jsonStringField) {
                const data = JSON.parse(values.jsonStringField);
                await importJSONData(data, values.importMethodField);
              } else {
                try {
                  for (const file of values.dataFileField) {
                    await importDataFromFile(file, values.importMethodField);
                  }
                } catch (error) {
                  console.error(error);
                  await showToast({ title: "Error Reading File", style: Toast.Style.Failure });
                }
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="importMethodField"
        title="Import Method"
        defaultValue="Merge2"
        info={`'Merge, Maintain duplicates' keeps existing and newly specified items, potentially producing duplicate entries.
      
'Merge, Remove duplicates' keeps all existing items and any new items with a unique name.
      
'Replace all data' removes existing items and add the newly specified items.`}
      >
        <Form.Dropdown.Item key="Merge1" title="Merge, Maintain duplicates" value="Merge1" />
        <Form.Dropdown.Item key="Merge2" title="Merge, Remove duplicates" value="Merge2" />
        <Form.Dropdown.Item key="Replace" title="Replace all data" value="Replace" />
      </Form.Dropdown>

      {selectedFiles ? null : (
        <Form.TextArea
          id="jsonStringField"
          title="JSON String"
          placeholder="Enter a JSON string..."
          error={jsonError}
          onChange={(jsonString) => {
            if (jsonString.length == 0) {
              setJSONError("Please enter a JSON string!");
              return;
            }
            checkJSONFormat(jsonString, setJSONError);
            setJSONContent(jsonString);
          }}
          info={`Must be a valid JSON string specifying groups and pins. For example:

{"groups":[{"name":"Group","icon":"Plus","id":1}],"pins":[{"name":"Pin","url":"https://google.com","icon":"Link","group":"Group","id":1}]}`}
        />
      )}

      {!selectedFiles && !jsonContent ? <Form.Description title="" text="OR" /> : null}

      {jsonContent ? null : (
        <Form.FilePicker
          title="Data Files"
          id="dataFileField"
          info={`One or more files containing Pins data in any of the following formats: JSON, CSV, TOML, YAML, or XML.
          
Note: When importing CSV files, import groups first, then pins.`}
          error={fileError}
          onChange={(files) => {
            if (files.length == 0) {
              setFileError("Please select a file!");
              return;
            }
            for (const file of files) {
              checkFileValidity(file, setFileError);
            }
            setSelectedFiles(files);
          }}
        />
      )}
    </Form>
  );
};

/**
 * Raycast command for importing pins and groups from a JSON string.
 */
export default function ImportPinsDataCommand() {
  return <ImportDataForm />;
}
