import * as fs from "fs";
import YAML from "json-to-pretty-yaml";
import { toXML } from "jstoxml";

import { Parser } from "@json2csv/plainjs";
import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";

import { getPinsJSON } from "./lib/Pins";

/**
 * Preferences for the Copy Pins Data command.
 */
type CopyPinsPreferences = {
  /**
   * A directory to export pins to, if any. By default, pins are copied to the clipboard.
   */

  exportLocation: string;

  /**
   * The format to export pins in. Either "csv" or "json" (default).
   */
  exportFormat: string;
};

/**
 * Raycast command for exporting Pins and Groups data to the clipboard or a file.
 */
export default async function ExportPinsCommand() {
  const preferences = getPreferenceValues<CopyPinsPreferences>();

  let data = "";
  const jsonData = await getPinsJSON();
  if (preferences.exportFormat == "csv") {
    try {
      const parser = new Parser();
      data = parser.parse(jsonData.pins) + "\n\n\n" + parser.parse(jsonData.groups);
    } catch (err) {
      console.error(err);
    }
  } else if (preferences.exportFormat == "json") {
    data = JSON.stringify(jsonData, null, 2);
  } else if (preferences.exportFormat == "yaml") {
    data = YAML.stringify(jsonData);
  } else if (preferences.exportFormat == "xml") {
    data = toXML(jsonData, { indent: "  " });
  }

  if (
    preferences.exportLocation.trim().length > 0 &&
    preferences.exportLocation != "/" &&
    (await fs.promises.access(preferences.exportLocation, fs.constants.W_OK)) == undefined
  ) {
    try {
      // For CSVs, split the data into two files: one for pins, one for groups
      // JSON and YAML files are fine to export all at once
      const exports = data.split("\n\n\n");
      for (let i = 0; i < exports.length; i++) {
        const exportPath = preferences.exportLocation.trim();
        const filename = `pins-export-${new Date().toISOString()}${exports.length > 1 ? `-${i + 1}` : ""}`;
        const exportFile = `${exportPath}/${filename}.${preferences.exportFormat}`;
        fs.writeFileSync(exportFile, exports[i]);
        await showToast({ title: `Exported pins to ${exportFile}!` });
      }
    } catch (err) {
      console.error(err);
      await showToast({ title: "Failed to export pins.", style: Toast.Style.Failure });
    }
  } else {
    // When using the clipboard, just copy all of the data at once
    await Clipboard.copy(data);
    const text = await Clipboard.readText();
    if (text == data) {
      await showToast({ title: "Copied pin data to clipboard!" });
    } else {
      await showToast({ title: "Failed to copy pins to clipboard.", style: Toast.Style.Failure });
    }
  }
}
