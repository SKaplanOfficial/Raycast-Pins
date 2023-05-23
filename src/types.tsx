export type Group = { name: string; icon: string; id: number };

export type Pin = {
  name: string;
  url: string;
  icon: string;
  group: string;
  id: number;
  application: string;
  expireDate?: Date;
};

export interface ExtensionPreferences {
  showCategories: boolean;
  showOpenAll: boolean;
  preferredBrowser: string;
  showPinShortcut: boolean;
}
