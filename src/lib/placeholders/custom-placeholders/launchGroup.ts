import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { Pin, openPin } from "../../Pins";
import { getStorage, storageMethods } from "../../storage";
import { StorageKey } from "../../constants";
import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences } from "../../preferences";
import { Group } from "../../Groups";
import { addObjectsToStore, getObjectsFromStore, updateObjectInStore } from "../../../hooks/useLocalObjectStore";

/**
 * Placeholder directive for opening/launching all pins in a target group.
 */
const LaunchGroupDirective: Placeholder = {
  name: "launchGroup",
  regex: /{{(launchGroup|openGroup):(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/,
  rules: [],
  apply: async (str) => {
    const matches = str.match(/{{(launchGroup|openGroup):(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/);
    const targetRep = matches?.[2] || "";
    if (!targetRep) return { result: "" };
    const pins: Pin[] = await getObjectsFromStore<Pin>(StorageKey.PIN_STORE, storageMethods);

    const groups: Group[] = (await getStorage(StorageKey.LOCAL_GROUPS)) || [];
    const target = groups.find((g) => g.name == targetRep || g.id.toString() == targetRep);
    if (!target) return { result: "" };
    const groupPins = pins.filter((p) => p.group == target.name);
    const preferences = getPreferenceValues<ExtensionPreferences>();
    await Promise.all(
      groupPins.map((p) =>
        openPin(
          p,
          preferences,
          async (pin: Pin) => {
            await addObjectsToStore(StorageKey.PIN_STORE, pins, [pin], storageMethods);
          },
          async (pin: Pin) => {
            await updateObjectInStore(pins, pin, true, StorageKey.PIN_STORE, storageMethods);
          },
        ),
      ),
    );
    return { result: "" };
  },
  constant: false,
  fn: async (target: string) => (await LaunchGroupDirective.apply(`{{launchPin:${target}}}`)).result,
  example: "{{launchPin:myPinName}}",
  description: "Opens the target pin.",
  hintRepresentation: "{{launchPin:...}}",
  fullRepresentation: "Launch Group",
  type: PlaceholderType.StaticDirective,
  categories: [PlaceholderCategory.Meta],
};

export default LaunchGroupDirective;
