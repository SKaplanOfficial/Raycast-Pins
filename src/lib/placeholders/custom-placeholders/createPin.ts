import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { buildGroup, getGroups, validateGroups } from "../../group";
import { storageMethods } from "../../storage";
import { buildPin, getPins, validatePins } from "../../pin";
import { saveObjects, updateStoredObjects } from "../../../hooks/useLocalObjectStore";
import { storageKeys } from "../../common";

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

    const allGroups = await getGroups();
    if (group != "None" && !allGroups.some((g) => g.name == group)) {
      const newGroup = buildGroup({ name: group, icon: "None" });
      await saveObjects([newGroup], allGroups, storageKeys.groupStore, storageMethods, validateGroups);
    }

    const newPin = buildPin({
      name,
      url: target,
      group,
    });
    const pins = await getPins();
    await updateStoredObjects([newPin], pins, storageKeys.pinStore, storageMethods, validatePins);
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
