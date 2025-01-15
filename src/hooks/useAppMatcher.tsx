import { Application, getApplications, getPreferenceValues } from "@raycast/api";
import { useCallback, useState } from "react";

const TerminalApp: Application = {
  name: "Terminal",
  path: "/System/Applications/Utilities/Terminal.app",
  bundleId: "com.apple.Terminal",
};

export default function useAppMatcher() {
  const [matchingApps, setMatchingApps] = useState<Application[]>([]);
  const [suggestion, setSuggestion] = useState<string | undefined>();
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const queryMatchingApps = useCallback(async (target: string, selection: string) => {
    let apps: Application[] = [];
    let suggestion: string | undefined = selection;

    try {
      apps = await getApplications(target);
    } catch {
      apps = await getApplications();
    }

    if (target.match(/^[a-zA-Z0-9]*?:.*/g)) {
      // Target is URL-like, so use the preferred browser if one is set
      const browser = apps.find((app) => app.name == (preferences.preferredBrowser?.name || "Safari"));
      apps.sort((a, b) => (a.name === browser?.name ? -1 : b.name === browser?.name ? 1 : 0));
      if (selection == undefined || selection == "None") {
        suggestion = browser?.path;
      }
    } else {
      if (!apps.find((app) => app.name === TerminalApp.name)) {
        apps.push(TerminalApp);
      }
    }
    setMatchingApps(apps);
    setSuggestion(suggestion);
    return [apps, suggestion] as const;
  }, []);

  return { matchingApps, queryMatchingApps, suggestion };
}
