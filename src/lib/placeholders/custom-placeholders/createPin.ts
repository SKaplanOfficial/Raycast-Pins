import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { Group, createNewGroup } from "../../Groups";
import { StorageKey } from "../../common";
import { getStorage, storageMethods } from "../../storage";
import { buildPin, Pin, validatePins } from "../../pin";
import { getStoredObjects, updateStoredObjects } from "../../../hooks/useLocalObjectStore";

/**
 * Placeholder directive for creating a new pin.
 */
const CreatePinDirective: Placeholder = {
  name: "createPin",
  regex:
    /{{createPin:(([^{]|{(?!{)|{{[\s\S]*?}})*?)(:(([^{]|{(?!{)|{{[\s\S]*?}})*?))?(:(([^{]|{(?!{)|{{[\s\S]*?}})*?))?}}/,
  rules: [],
  apply: async (str) => {
    const matches = str.match(
      /{{createPin:(([^{]|{(?!{)|{{[\s\S]*?}})*?)(:(([^{]|{(?!{)|{{[\s\S]*?}})*?))?(:(([^{]|{(?!{)|{{[\s\S]*?}})*?))?}}/,
    );
    const name = matches?.[1] || "";
    const target = matches?.[4] || name;
    const group = matches?.[7] || "None";
    if (!name) return { result: "" };

    const allGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
    if (group != "None" && !allGroups.some((g) => g.name == group)) {
      await createNewGroup({ name: group, icon: "None" });
    }

    const newPin = buildPin({
      name,
      url: target,
      group,
    });
    const pins = await getStoredObjects<Pin>(StorageKey.PIN_STORE, storageMethods, validatePins);
    await updateStoredObjects([newPin], pins, StorageKey.PIN_STORE, storageMethods, validatePins);
    return { result: "" };
  },
  constant: false,
  fn: async (name, target, group) =>
    (await CreatePinDirective.apply(`{{createPin:${name}:${target}:${group}}}`)).result,
  example: "{{createPin:myPinName:myPinTarget:myPinGroup}}",
  description: "Creates a new pin.",
  hintRepresentation: "{{createPin:...:...:...}}",
  fullRepresentation: "Create Pin",
  type: PlaceholderType.InteractiveDirective,
  categories: [PlaceholderCategory.Meta],
};

export default CreatePinDirective;
