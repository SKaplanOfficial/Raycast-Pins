# Pins DevLog - A more detailed changelog

### 2023-06-18

- Added {{selectedFiles}} placeholder, which inserts the paths of the selected files in Finder as a comma-separated list

### 2023-06-17

- Added {{url:...}} placeholder, which inserts the visible text content at the specified URL
    - Alias: {{URL:...}}
- Added {{uuid}} placeholder, which inserts a unique UUID generated at runtime
    - Alias: {{UUID}}
- Added {{usedUUIDs}} placeholder, which inserts the list of UUIDs used by the {{uuid}} placeholder since Pins' LocalStorage was last reset
- Added {{as:...}} and {{shell:...}} placeholders for executing AppleScript and shell scripts, respectively
- Added {{js:...}} placeholder, which inserts the result of executing the specified JavaScript code
    - Alias: {{JS:...}}
- Added {{previousPinName}} and {{previousPinTarget}} placeholders, which insert the URL-encoded name and target of the last pin opened
- Added {{jxa:...}} placeholder, which inserts the result of executing the specified JavaScript for Automation code
    - Alias: {{JXA:...}}
- Added {{day}} placeholder, which inserts the name of the current weekday
    - Alias: {{dayName}}
    - Supports specifying a locale via optional argument, e.g. {{day locale="nl-NL"}}
- Added support for custom date and time formats in {{date}} and {{time}} placeholders
    - Supports specifying a custom format via optional argument, e.g. {{date format="yyyy-MM-dd"}} or {{time format="HH:mm:ss"}}

### 2023-06-16

- Added setting to show/hide Pin subtitles in the "View Pins" command
- Added "Copy Pin Name" and "Copy Pin URL" actions in the "View Pins" command
- Added "Copy Group Name" action in the "View Groups" command
- Added {{previousApp}} placeholder, which inserts the name of the last focused application before the current one
    - Aliases: {{previousAppName}}, {{lastApp}}, and {{lastAppName}}
- Added support for Orion browser
- Remade Placeholders Guide in Markdown, now opens in default Markdown viewer
- "Open Placeholders Guide" action can now be used even if pins have been created, not just on first launch
- Fixed bug where opening a pin would attempt to apply all placeholders, even if they were not used in the pin, due to not checking for absence of aliases
    - Results in a significant speedup when opening pins
- Significantly improve inline documentation in case someone wants to fork the repo

### 2023-05-25

- Added placeholders system inspired by PromptLab
    - Limited selection of placeholders for now
- Added action to view placeholders guide while editing a pin
- Added setting to hide pins with placeholders that are not currently valid, e.g. {{selectedText}} when no text selected

### 2023-05-24

- Added action to install example pins on first launch
- Added setting to show "Create New Pin" item in menu bar dropdown
- Improved keyword search to include group names and sub-words of pin targets
- Moved "Pin This/These File(s)" menus into their own "Quick Pins" section, which can be hidden via settings
- Fixed bug where menu bar dropdown would not update after adding pins for the first time

### 2023-05-23

- Added "Pin This/These Note(s)" menu item for pinning the selected note(s) in Notes
    - When multiple notes are selected, a new group will be automatically created to contain the pins
- Added "Pin This" menu items for various document-based apps, e.g. Pages and MS Word
- Added setting to choose which section appears first in the menu bar dropdown
    - Defaults to "Pins", which will show all non-grouped pins first, then groups second
- Added setting to display "Recent Applications" group

### 2023-05-22

- Added per-pin "Open With" setting to allow you to choose which application to open the pin in
    - Defaults to "None", which will open the pin in the default application for the URL/path
    - Attempts to determine likely applications based on the URL/path
- Added per-pin "Expiration Date" setting to automatically remove the pin after a given date & time
- Added support for pinning Terminal commands
    - Command will run in a new Terminal tab
- Added "Pin This/These File(s)" menu item for pinning the selected file(s) in Finder
    - When multiple files are selected, a new group will be automatically created to contain the pins
- Added "Pin All Tabs" menu item for pinning all tabs in the current browser window (for supported browsers)
    - When multiple tabs are selected, a new group will be automatically created to contain the pins
- Add ability to reorder groups (i.e. move up/down in the list & in menu bar menu)
- Fixed bug where NEXT_PIN_ID would not be set upon importing data, causing repeated pin IDs
- Fixed bug where pins would attempt to fetch favicons for non-URL targets, causing endless warnings in the console
- Fixed bug where "Pin This Tab" would fail if the tab name contained commas