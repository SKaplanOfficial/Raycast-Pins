import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { getPins } from "../../pin";
import { storageMethods } from "../../storage";
import { deleteItem } from "../../../components/actions/DeleteItemAction";
import { removeStoredObjects } from "../../../hooks/useLocalObjectStore";
import { storageKeys } from "../../common";

/**
 * Placeholder directive for deleting a pin.
 */
const DeletePinDirective: Placeholder = {
  name: "deletePin",
  regex: /{{deletePin( silent=(true|false))?:(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/,
  rules: [],
  apply: async (str) => {
    const matches = str.match(/{{deletePin( silent=(true|false))?:(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/);
    const silent = matches ? matches[2] == "true" : false;
    const pinRef = matches ? matches[3] : "";
    if (!pinRef) return { result: "" };

    const allPins = await getPins();
    const pin = allPins.find((p) => p.name == pinRef || p.id.toString() == pinRef);
    if (!pin) return { result: "" };

    await deleteItem(
      pin,
      (item) => removeStoredObjects([item], allPins, storageKeys.pinStore, storageMethods),
      { requireConfirmation: !silent },
    );
    return { result: "" };
  },
  constant: false,
  fn: async (pinRef, silent = "false") =>
    (await DeletePinDirective.apply(`{{deletePin silent=${silent}:${pinRef}}}`)).result,
  example: "{{deletePin:pinName}}",
  description: "Deletes a pin.",
  hintRepresentation: "{{deletePin silent=true:...}}",
  fullRepresentation: "Delete Pin",
  type: PlaceholderType.InteractiveDirective,
  categories: [PlaceholderCategory.Meta],
};

export default DeletePinDirective;
