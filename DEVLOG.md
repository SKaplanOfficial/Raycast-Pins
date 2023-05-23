# Pins DevLog - A more detailed changelog

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