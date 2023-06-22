# Pins DevLog - A more detailed changelog

## 1.4.0 (Asteria) Release, TBD

### Planned

- AST0: New Features
    - AST0a: Text fragment pins
    - AST0b: Directives
        - AST0b1: {{copy:…}} (COMPLETE)
        - AST0b2: {{paste:…}} (COMPLETE)
        - AST0b3: {{write to [file]:...}}
        - AST0b4: {{open in [app]:…}}? Maybe not
        - AST0b5: {{askAI:…}}
        - AST0b6: {{delay for [interval]:…}} (COMPLETE)
            - Delays execution of the content of the directive for the specified interval.
            - Content must be one of: script placeholder | directive
            - <30s No diff from AppleScript
            - >30s: Called on update interval, command not kept active
        - AST0b7 / AST0c1: {{set x:...}} (COMPLETE)
        - AST0b8 / AST0c2: {{delete x}} (COMPLETE)
        - AST0b9 / AST0c4: {{reset x}} (COMPLETE)
        - AST0b10: {{ignore:...}} (COMPLETE)
            - Ignore the result of the specified value (substitute the value with an empty string)
        - AST0b11 / AST0c3: {{get x}} (COMPLETE)
    - AST0c: Persistent Variables
        - AST0c1 / AST0b7: {{set x:...}} (COMPLETE)
            - Set a persistent variable x to the value specified by ...
        - AST0c2 / AST0b8: {{delete x}} (COMPLETE)
            - Delete the persistent variable x
        - AST0c3 / AST1a1: {{get x}} (COMPLETE)
            - Get the current value of the persistent variable x
        - AST0c4 / AST0b9: {{reset x}}? (COMPLETE)
            - Reset the persistent variable x to its initial value
    - AST0d: Fine-grained preferences for which Quick Pins to display
- AST1: New Placeholders
    - AST1a: New Information Placeholders:
        - AST1a2: {{file:...}} (COMPLETE)
        - AST1a3: {{shortcut:...:input}} (COMPLETE)
            - Run a Siri Shortcut and return the result
        - AST1a4: {{shortcuts}} (COMPLETE)
            - List all Siri Shortcuts
        - AST1a5: {{todayEvents}}
        - AST1a6: {{tomorrowEvents}}
        - AST1a7: {{weekEvents}}
        - AST1a8: {{monthEvents}}
        - AST1a9: {{yearEvents}}
        - AST1a10: {{todayReminders}}
        - AST1a11: {{tomorrowReminders}}
        - AST1a12: {{weekReminders}}
        - AST1a13: {{monthReminders}}
        - AST1a14: {{yearReminders}}
        - AST1a15: {{location}}
        - AST1a16: {{lastEmail}}
        - AST1a17: {{lastNote}}
        - AST1a18: {{lastMessage}}
        - AST1a19: {{currentTrack}}
        - AST1a20: {{currentTrackAlbum}}
        - AST1a21: {{currentTrackArtist}}
        - AST1a22: {{tabs}}
        - AST1a23: {{runningApplications}}
        - AST1a24: {{input}} (COMPLETE)
            - Ask the user for input
        - AST1a25: {{selectedFileContents}} (COMPLETE)

    - AST1b: Script Placeholders:
        - AST1b1: {{py:…}}? (REJECTED)
        - AST1b2: {{rust:…}}? (REJECTED)
        - AST1b3: {{go:…}}? (REJECTED)
        - AST1b4: {{perl:…}} (REJECTED)
        - AST1b5: {{php:…}} (REJECTED)
        - AST1b7: {{lua:…}} (REJECTED)
- AST2: Bug Fixes
    - AST2a: Non-url targets that resemble URLs are sometimes treated as URLs, e.g. "button%20returned:ok" is treated as a URL (RESOLVED)
    - AST2b: Leaving pin name blank does not use the target as the pin name (RESOLVED)
    - AST2c: {{selectedText}} placeholder causes alert sound to play when no text is selected (RESOLVED)
- AST3: UI enhancements
    - AST3a: Show icon for application that Pins launch with as an accessory (COMPLETE)
    - AST3b: Show date that pin expires on as an accessory (COMPLETE)
    - AST3c: Show accessory icon for whether a Terminal command pin executes in the background or foreground (COMPLETE)
- AST4: New Quick Pins
    - AST4a: Pin selected text as text fragment (COMPLETE)

### 2023-06-22

- Added additional aliases for various placeholders
- Added {{selectedFileContents}} placeholder, which inserts the text contents of the selected file(s) in Finder
- Added {{input [prompt]:...}} placeholder, which prompts the user for input with the specified prompt using a dialog window
- Added {{shortcut:... [input]="..."}} placeholder, which executes the specified Siri Shortcut with the specified input, if present, and inserts the result
- Added {{shortcuts}} placeholder, which inserts a list of all Siri Shortcuts on the system
- Added accessories for list items in "View Pins" command:
    - Expiration date, if one is set
    - Application that the pin opens with, if one is set
    - Terminal icon for Terminal command pins
    - Terminal command visibility setting
    - Text icon for text fragment pins
- Added settings for showing/hiding each accessory in the "View Pins" command

### 2023-06-21

- Added {{set [name]:...}}, {{reset [name]}}, {{get [name]}}, and {{delete [name]}} placeholders for managing persistent variables
- Added {{ignore:...}} placeholder, which ignores all content within it
- Added {{copy:...}} and {{paste:...}} placeholders, which copy and paste the specified text, respectively, and show indicators accordingly

### 2023-06-20

- Added setting to treat pin target as a text fragment. "Opening" a text fragment pin will copy the raw text of the target, without applying any placeholders, executing any scripts, or opening any URLs.
- Added Quick Pin to pin selected text as a text fragment
- Added {{file:...}} placeholder, which inserts the text contents of the file at the specified path
    - The path can be absolute or relative to the user's home directory using the ~ character
- Fixed bug where non-url targets that resemble URLs are sometimes treated as URLs (e.g. "button%20returned:ok" was treated as a URL, now it is not)
- Fixed bug where leaving pin name blank did not use the target as the pin name, despite saying it would
- Fixed bug where the {{selectedText}} placeholder caused an alert sound to play if no text was selected

## 1.3.0 Release, 2023-06-19

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

## 1.2.0 Release, 2023-05-20

- Start of developer log.