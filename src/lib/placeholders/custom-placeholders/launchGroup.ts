import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { Pin, getPins, openPin, validatePins } from "../../pin";
import { storageMethods } from "../../storage";
import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences } from "../../preferences";
import { getGroups } from "../../group";
import { updateStoredObjects } from "../../../hooks/useLocalObjectStore";
import { storageKeys } from "../../common";

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
    
    const pins = await getPins();
    const groups = await getGroups();
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
            await updateStoredObjects([pin], pins, storageKeys.pinStore, storageMethods, validatePins);
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
