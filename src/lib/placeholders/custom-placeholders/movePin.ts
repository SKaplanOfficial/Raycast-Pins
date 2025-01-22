import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { getPins, validatePins } from "../../pin";
import { Group, buildGroup, getGroups, validateGroups } from "../../group";
import { storageKeys, Visibility } from "../../common";
import { storageMethods } from "../../storage";
import { saveObjects, updateStoredObjects } from "../../../hooks/useLocalObjectStore";

/**
 * Placeholder directive for moving a pin to a different group.
 */
const MovePinDirective: Placeholder = {
  name: "movePin",
  regex: /{{movePin:(([^{]|{(?!{)|{{[\s\S]*?}})*?)(:(([^{]|{(?!{)|{{[\s\S]*?}})*?))}}/,
  rules: [],
  apply: async (str) => {
    const matches = str.match(/{{movePin:(([^{]|{(?!{)|{{[\s\S]*?}})*?)(:(([^{]|{(?!{)|{{[\s\S]*?}})*?))}}/);
    const pinRef = matches?.[1] || "";
    if (!pinRef) return { result: "" };

    const allPins = await getPins();
    const pin = allPins.find((p) => p.name == pinRef || p.id.toString() == pinRef);
    if (!pin) return { result: "" };

    const group = matches?.[4];
    if (!group) return { result: "" };

    const allGroups = await getGroups();
    if (group != "None" && !allGroups.some((g) => g.name == group)) {
      let newGroup: Group;
      if (group === "Expired Pins") {
        newGroup = buildGroup({
          name: group,
          icon: "BellDisabled",
          visibility: Visibility.HIDDEN,
        });
      } else {
        newGroup = buildGroup({
          name: group,
          icon: "None",
        });
      }
      await saveObjects([newGroup], allGroups, storageKeys.groupStore, storageMethods, validateGroups);
    }

    await updateStoredObjects([{ ...pin, group: group }], allPins, storageKeys.pinStore, storageMethods, validatePins);
    return { result: "" };
  },
  constant: false,
  fn: async (name, group) => (await MovePinDirective.apply(`{{movePin:${name}:${group}}}`)).result,
  example: "{{movePin:pinName:groupName}}",
  description: "Moves a pin to the target group.",
  hintRepresentation: "{{movePin:...:...}}",
  fullRepresentation: "Move Pin",
  type: PlaceholderType.InteractiveDirective,
  categories: [PlaceholderCategory.Meta],
};

export default MovePinDirective;
