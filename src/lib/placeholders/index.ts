import { DefaultPlaceholders, PlaceholderType, utils } from "placeholders-toolkit";
import DelayDirective from "./custom-placeholders/delay";
import InputDirective from "./custom-placeholders/input";
import LocationPlaceholder from "./custom-placeholders/location";
import LatitudePlaceholder from "./custom-placeholders/latitude";
import LongitudePlaceholder from "./custom-placeholders/longitude";
import StreetAddressPlaceholder from "./custom-placeholders/address";
import PreviousApplicationPlaceholder from "./custom-placeholders/previousApplication";
import PreviousPinNamePlaceholder from "./custom-placeholders/previousPinName";
import PreviousPinTargetPlaceholder from "./custom-placeholders/previousPinTarget";
import AskAIDirective from "./custom-placeholders/askAI";
import GroupsPlaceholder from "./custom-placeholders/groups";
import GroupNamesPlaceholder from "./custom-placeholders/groupNames";
import PinsPlaceholder from "./custom-placeholders/pins";
import PinTargetsPlaceholder from "./custom-placeholders/pinTargets";
import PinNamesPlaceholder from "./custom-placeholders/pinNames";
import { JavaScriptPlaceholder } from "placeholders-toolkit/dist/lib/defaultPlaceholders";
import vm from "vm";
import PinStatisticsPlaceholder from "./custom-placeholders/pinStatistics";

const filteredPlaceholders = Object.values(DefaultPlaceholders).filter((p) => !["location", "javascript"].includes(p.name));

const PinsPlaceholders = [
  DelayDirective,
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.Informational),
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.StaticDirective),
  LocationPlaceholder,
  LatitudePlaceholder,
  LongitudePlaceholder,
  StreetAddressPlaceholder,
  PreviousApplicationPlaceholder,
  PreviousPinNamePlaceholder,
  PreviousPinTargetPlaceholder,
  PinNamesPlaceholder,
  PinTargetsPlaceholder,
  PinsPlaceholder,
  PinStatisticsPlaceholder,
  GroupNamesPlaceholder,
  GroupsPlaceholder,
  AskAIDirective,
  InputDirective,
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.InteractiveDirective),
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.Custom),
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.Script),
];

JavaScriptPlaceholder.apply = async (str: string) => {
  try {
    const script = str.match(
      /(?<=(js|JS))( target="(.*?)")?:(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/
    )?.[4];
    const target = str.match(
      /(?<=(js|JS))( target="(.*?)")?:(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/
    )?.[3];
    if (!script) return { result: "", js: "" };

    if (target) {
      // Run in active browser tab
      const res = await utils.runJSInActiveTab(
        script.replaceAll(/(\n|\r|\t|\\|")/g, "\\$1"),
        target
      );
      return { result: res, js: res };
    }

    // Run in sandbox
    const sandbox = PinsPlaceholders.reduce(
      (acc, placeholder) => {
        acc[placeholder.name] = placeholder.fn;
        return acc;
      },
      {} as { [key: string]: (...args: never[]) => Promise<string> }
    );
    sandbox["log"] = async (str: string) => {
      console.log(str); // Make logging available to JS scripts
      return "";
    };
    const res = await vm.runInNewContext(script, sandbox, {
      timeout: 1000,
      displayErrors: true,
    });
    return { result: res, js: res };
  } catch (e) {
    return { result: "", js: "" };
  }
};

PinsPlaceholders.push(JavaScriptPlaceholder);

export default PinsPlaceholders;
