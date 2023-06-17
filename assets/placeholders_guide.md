# Placeholders for Raycast Pins

------------------------

Author: Stephen Kaplan _(HelloImSteven)_ <br />
Last Updated: 2023-06-16 <br />
Pins Version: 1.3.0

------------------------

#### Overview

Pins supports various placeholders that are evaluated at runtime whenever you open/execute a pin. These placeholders are useful for pinning items that rely on the current context, such as the current selection. The placeholders system is provided as a way to supply additional functionality for users that need or want it without complicating the core functionality of Pins.

------------------------

#### Placeholders Currently Supported

| Placeholder | Replaced With |
| ----- | ----- |
| `{{clipboardText}}` | The current text content of the clipboard. |
| `{{currentAppName}}` | The name of the frontmost application. |
| `{{currentAppPath}}` | The POSIX path to the bundle of the frontmost application. |
| `{{currentDirectory}}` | The POSIX path of Finder's current insertion location. This is the desktop if no Finder windows are open. |
| `{{currentTabText}}` | The visible text of the current tab of the frontmost browser window. |
| `{{currentURL}}` | The URL of the active tab of the frontmost browser window. |
| `{{date}}` or <br /> `{{currentDate}}` | The current date (day number, month name, year) |
| `{{homedir}}` or <br /> `{{homeDirectory}}` | The path to the user's home directory. |
| `{{hostname}}` | The hostname of the computer. |
| `{{previousApp}}` or <br /> `{{previousAppName}}` or <br /> `{{lastApp}}` or <br /> `{{lastAppName}}` | The name of the last application that was active before the current one. |
| `{{selectedText}}` | The currently selected text. |
| `{{systemLanguage}}` or <br /> `{{language}}` | The configured language for the system. |
| `{{time}}` or <br /> `{{currentTime}}` | The current time (hours, minutes, seconds) |
| `{{user}}` or <br /> `{{username}}` | The current user's system username. |

------------------------

#### Resources

- [Pins GitHub Repository](https://github.com/SKaplanOfficial/Raycast-Pins)
- [PromptLab Placeholders Guide](https://github.com/SKaplanOfficial/Raycast-PromptLab#placeholders) **NOTE: Pins supports only a subset of the PromptLab placeholders.**
- [Raycast Manual](https://manual.raycast.com)
