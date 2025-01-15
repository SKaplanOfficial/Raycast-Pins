import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { Pin, validatePins } from "../../pin";
import { Group, createNewGroup } from "../../Groups";
import { StorageKey, Visibility } from "../../common";
import { storageMethods } from "../../storage";
import { getStoredObjects, updateStoredObjects } from "../../../hooks/useLocalObjectStore";

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

    const allPins: Pin[] = await getStoredObjects<Pin>(StorageKey.PIN_STORE, storageMethods);
    const pin = allPins.find((p) => p.name == pinRef || p.id.toString() == pinRef);
    if (!pin) return { result: "" };

    const group = matches?.[4];
    if (!group) return { result: "" };

    const allGroups: Group[] = await getStoredObjects<Group>(StorageKey.GROUP_STORE, storageMethods);
    if (group != "None" && !allGroups.some((g) => g.name == group)) {
      if (group === "Expired Pins") {
        await createNewGroup({ name: group, icon: "BellDisabled", visibility: Visibility.HIDDEN });
      } else {
        await createNewGroup({ name: group, icon: "None" });
      }
    }

    await updateStoredObjects([{ ...pin, group: group }], allPins, StorageKey.PIN_STORE, storageMethods, validatePins);
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
