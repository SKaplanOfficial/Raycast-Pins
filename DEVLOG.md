# Pins DevLog - A more detailed changelog

## 1.7.0 Release, TBA

### 2024-01-12

- Added target group selection in menu bar dropdown.
  - The selected group will be used when creating new pins.
- Added support for pin tooltips in the menu bar dropdown.
- Added alternate menu item each pin to open the pin edit form.

### 2024-01-11

- Use gpt-3.5-turbo-instruct instead of text-davinci-003 for AI placeholder.
- Added quick pin for the currently playing track in Music, TV, or Spotify.
- Fixed bug where non-document-based applications that expose an Applescript API could yield an error upon LocalData updates.
- Improved error handling for LocalData operations.

## 1.6.0 Release, 2023-12-29

### 2023-12-28

- Added optional `offsets` parameter to the `{{clipboardText}}` placeholder
- Selected text will no longer be automatically detected when the menu is opened, but will still be detected when the pin is opened.

### 2023-11-10

- Improved placeholder detection logic to better handle nested placeholders

### 2023-11-08

- Added `{{write to="[Path]":...}}` placeholder for writing text to a file at the specified path. The path can be absolute or relative to the user's home directory using the ~ character.
  - Supports `append=(true|false)` parameter for appending to the file instead of overwriting it.
  - Supports `end="..."` parameter for specifying an end token. The default is two newlines.
- Added `{{chooseFile}}`, `{{chooseFolder}}`, and `{{chooseApplication}}` placeholders.
  - Supports `multiple=(true|false)` parameter for selecting multiple files/folders/applications.

### 2023-11-07

- Extract placeholders into their own node package.
- Added placeholder tooltips, similar to PromptLab.
- Added ability to edit or copy placeholders by right-clicking on them in the menu bar dropdown.

## 1.5.0 Release, 2023-11-01

### 2023-11-01

- Update dependencies, including latest Raycast API version (1.60.1).

### 2023-10-30

- Fix bug where using "}" or "{" in a placeholder's content could cause unexpected results (including code execution).

### 2023-10-24

- Fixed bug where inputting web URLs in the target field would prevent the list of 'Open With' applications from properly updating and leaving only a "None" option
- Fixed bug where editing a pin could cause its ID to be nullified, effectively deleting the pin
- Adjusted the `{{alert:...}}`, `{{dialog:...}}`, and `{{toast:...}}` placeholders to accept a `title` argument instead of specifying the title alongside the message in the placeholder content.
- Added `{{timezone}}` placeholder. Inserts the long name of the user's timezone.

### 2023-09-06

- Added action to create a subgroup of the selected group
- Added actions for deleting all pins or groups at once
- Added ability to install example groups separately from example pins
- Added ability to install example groups or pins while there are already pins/groups present. Existing items will be preserved.
- The action to install example pins will now always display when no pins are present (same for groups)
- Groups are now properly hidden from the menu bar dropdown when they have no pins (and no pins in their subgroups)
- Added group statistics

## 1.4.0 Release, 2023-09-11

### 2023-09-05

- Various bug fixes and improvements
- Added `{{currentApplicationBundleID}}` placeholder, which inserts the bundle ID of the current application
  - Aliases: `{{currentAppBundleID}}`, `{{currentApplicationID}}`, `{{currentAppID}}`
- Added `{{pinNames}}` placeholder, which inserts a list of all pin names. Use `amount=[number]` argument to randomly select a number of names from the list.
- Added `{{pinTargets}}` placeholder, which inserts a list of all pin targets. Can also specify amount here.
- Added `{{groupNames}}` placeholder, which inserts a list of all group names. Can also specify amount here.
- Added `{{pins}}` and `{{groups}}` placeholders for inserting the JSON representation of pins and groups, respectively. Can also specify amount here.
- Added `{{statistics}}` placeholder for inserting pin statistics such as frequency of use, average execution time, and more. Use `sort=[alpha|alphabetical|freq|frequency|recency|dateCreated]` argument to sort the list. Also supports the `amount` argument.
- Added the `{{type:...}}` directive to type text into the frontmost application.
- Fixed bug where pin keyboard shortcuts would incorrectly get flagged as reserved by the extension.

### 2023-09-04

- Added settings to export Pins data in CSV, JSON, TOML, YAML, or XML format, and/or to save the data to a file.
- Added support for customizing the icon color of pins and groups.
- Added setting for customizing the color of the main menu bar icon.
- The "Preferences..." menu item now opens the preferences for the menu bar command specifically
- Added pin statistics based on their creation date, last used date, frequency of use, placeholder usage, average execution time, and more. Statistics can be viewed while editing a pin.
- Added actions for copying pin statistics as formatted text or JSON.
- Added "Open Placeholders Guide" menu item, along with a setting to show/hide it. Hidden by default.

### 2023-09-03

- Added keyboard shortcuts for quick pins
- Added ability to set a keyboard shortcut for each pin. Some shortcuts are reserved for the extension itself.
- Added support for multi-layer groups (i.e. groups within groups). The parent group can be specified by providing its ID while editing a group.
- Added setting to hide/show the "Copy Pin Data" menu item.
- Added setting to hide/show the "Preferences..." menu item.
- Added setting for sorting pins alphabetically, by frequency, date last used, creation date, or manually. Groups can be controlled separately from non-grouped pins.
- Improved group deletion logic -- now hands children off to the parent group, if one exists.
- Added setting for showing/hiding the ID, parent, and sort method of groups.
- Fixed a bug where moving pins up and down would sometimes rearrange pins in other groups.
- Added ability to have Quick Pins at the top of the menu bar dropdown.

### 2023-09-02

- Added `{{alert timeout=[number]:[title],[message]}}` directive for displaying an alert with the specified title and message, with an optional timeout in seconds. The default timeout is 10 seconds.
- Added `{{ai model="[model]" creativity=[decimal]:...}}` directive for querying Raycast AI and inserting the response. Requires Raycast Pro.
- Added `{{dialog input=[true/false] timeout=[number]:[message],[title]}}` directive for displaying a dialog with the specified message and title, with an optional timeout in seconds. The default timeout is 30 seconds. If input is true, the dialog will have a text field for the user to enter text, and that text will be inserted into the pin. Otherwise, the placeholder will be replaced with an empty string.
- Added `{{say voice="[voice]" speed=[number] pitch=[number] volume=[number]:...}}` directive for speaking the specified text. All arguments are optional and default to the system's defaults.
- Added `{{toast style="[success/failure/fail]":[Title],[Message]}}` directive for displaying a toast notification with the specified title and optional message. The style argument is optional and defaults to "success". The notification will display as a toast if the Raycast window is open, otherwise it will display as a HUD.
  - Alias: `{{hud:...}}`
- Added `{{runningApplications}}` placeholder, which inserts a list of all running applications. The list is newline-separated by default, but you can specify a separator with `delim="..."`.
  - Alias: `{{runningApps}}`
- Added location placeholders: `{{location}}`, `{{address}}`, `{{latitude}}`, `{{longitude}}`
  - Aliases: `{{streetAddress}}`, `{{lat}}`, `{{lon}}`
- Fixed error where getting selection from Finder would fail if Finder is inactive (even if a window is open)

### 2023-06-22

- Added additional aliases for various placeholders
- Added `{{selectedFileContents}}` placeholder, which inserts the text contents of the selected file(s) in Finder
- Added `{{input [prompt]:...}}` placeholder, which prompts the user for input with the specified prompt using a dialog window
- Added `{{shortcut:... [input]="..."}}` placeholder, which executes the specified Siri Shortcut with the specified input, if present, and inserts the result
- Added `{{shortcuts}}` placeholder, which inserts a list of all Siri Shortcuts on the system
- Added accessories for list items in "View Pins" command:
  - Expiration date, if one is set
  - Application that the pin opens with, if one is set
  - Terminal icon for Terminal command pins
  - Terminal command visibility setting
  - Text icon for text fragment pins
- Added settings for showing/hiding each accessory in the "View Pins" command

### 2023-06-21

- Added `{{set [name]:...}}`, `{{reset [name]}}`, `{{get [name]}}`, and `{{delete [name]}}` placeholders for managing persistent variables
- Added `{{ignore:...}}` placeholder, which ignores all content within it
- Added `{{copy:...}}` and `{{paste:...}}` placeholders, which copy and paste the specified text, respectively, and show indicators accordingly

### 2023-06-20

- Added setting to treat pin target as a text fragment. "Opening" a text fragment pin will copy the raw text of the target, without applying any placeholders, executing any scripts, or opening any URLs.
- Added Quick Pin to pin selected text as a text fragment
- Added `{{file:...}}` placeholder, which inserts the text contents of the file at the specified path
  - The path can be absolute or relative to the user's home directory using the ~ character
- Fixed bug where non-url targets that resemble URLs are sometimes treated as URLs (e.g. "button%20returned:ok" was treated as a URL, now it is not)
- Fixed bug where leaving pin name blank did not use the target as the pin name, despite saying it would
- Fixed bug where the `{{selectedText}}` placeholder caused an alert sound to play if no text was selected

## 1.3.0 Release, 2023-06-19

### 2023-06-18

- Added `{{selectedFiles}}` placeholder, which inserts the paths of the selected files in Finder as a comma-separated list

### 2023-06-17

- Added `{{url:...}}` placeholder, which inserts the visible text content at the specified URL
  - Alias: `{{URL:...}}`
- Added `{{uuid}}` placeholder, which inserts a unique UUID generated at runtime
  - Alias: `{{UUID}}`
- Added `{{usedUUIDs}}` placeholder, which inserts the list of UUIDs used by the `{{uuid}}` placeholder since Pins' LocalStorage was last reset
- Added `{{as:...}}` and `{{shell:...}}` placeholders for executing AppleScript and shell scripts, respectively
- Added `{{js:...}}` placeholder, which inserts the result of executing the specified JavaScript code
  - Alias: `{{JS:...}}`
- Added `{{previousPinName}}` and `{{previousPinTarget}}` placeholders, which insert the URL-encoded name and target of the last pin opened
- Added `{{jxa:...}}` placeholder, which inserts the result of executing the specified JavaScript for Automation code
  - Alias: `{{JXA:...}}`
- Added `{{day}}` placeholder, which inserts the name of the current weekday
  - Alias: `{{dayName}}`
  - Supports specifying a locale via optional argument, e.g. `{{day locale="nl-NL"}}`
- Added support for custom date and time formats in `{{date}}` and `{{time}}` placeholders
  - Supports specifying a custom format via optional argument, e.g. `{{date format="yyyy-MM-dd"}}` or `{{time format="HH:mm:ss"}}`

### 2023-06-16

- Added setting to show/hide Pin subtitles in the "View Pins" command
- Added "Copy Pin Name" and "Copy Pin URL" actions in the "View Pins" command
- Added "Copy Group Name" action in the "View Groups" command
- Added `{{previousApp}}` placeholder, which inserts the name of the last focused application before the current one
  - Aliases: `{{previousAppName}}`, `{{lastApp}}`, and `{{lastAppName}}`
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
- Added setting to hide pins with placeholders that are not currently valid, e.g. `{{selectedText}}` when no text selected

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

## 1.2.0 Release, 2023-05-20

- Start of developer log.
