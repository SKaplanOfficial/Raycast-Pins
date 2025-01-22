import * as os from "os";
import path from "path";
import { useState } from "react";

import { Action, ActionPanel, Color, environment, Form, Icon, Keyboard, showToast, useNavigation } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

import { KEYBOARD_SHORTCUT, PinAction, Visibility } from "../lib/common";
import { buildGroup, Group } from "../lib/group";
import { buildPin, getPinStatistics, Pin } from "../lib/pin";
import CopyPinActionsSubmenu from "./actions/CopyPinActionsSubmenu";
import { PLChecker } from "placeholders-toolkit";
import PinsPlaceholders from "../lib/placeholders";
import TagForm from "./TagForm";
import DeleteItemAction from "./actions/DeleteItemAction";
import { useDataStorageContext } from "../contexts/DataStorageContext";
import useAppMatcher from "../hooks/useAppMatcher";
import { getIcon } from "../lib/utils";

export interface PinFormValues {
  nameField: string;
  urlField: string;
  iconField: string;
  groupField: string;
  openWithField: string;
  dateField: Date;
  execInBackgroundField: boolean;
  fragmentField: boolean;
  iconColorField: string;
  tagsField: string[];
  notesField: string;
  tooltipField: string;
  visibilityField: Visibility;
  expirationActionField: string;
  modifiersField: string[];
  keyField: string;
  aliasesField: string;
  expirationActionDestinationField: string;
  expirationActionCustomField: string;
}

/**
 * Form for creating/editing a new pin.
 * @param props.pin The pin to edit.
 * @param props.setPins The function to call to update the list of pins.
 * @param props.pins The list of all pins.
 */
export const PinForm = (props: { pin?: Pin; draftValues?: PinFormValues }) => {
  const { pin, draftValues } = props;
  const { pinStore, groupStore, tagStore } = useDataStorageContext();
  const { push, pop } = useNavigation();
  const [placeholderTooltip, setPlaceholderTooltip] = useState<string>("");
  const [urlError, setUrlError] = useState<string | undefined>();
  const [shortcutError, setShortcutError] = useState<string | undefined>();
  const [values, setValues] = useState({
    url: draftValues?.urlField || (pin ? pin.url : undefined),
    icon: draftValues?.iconField || (pin ? pin.icon : undefined),
    iconColor: draftValues?.iconColorField || (pin ? pin.iconColor : undefined),
    isFragment: draftValues?.fragmentField || (pin && pin.fragment ? true : false),
    application: draftValues?.openWithField || (pin ? pin.application : undefined),
    expireDate: draftValues?.dateField || (pin ? pin.expireDate : undefined),
    expirationAction: draftValues?.expirationActionField || (pin ? pin.expirationAction : undefined),
    tags: draftValues?.tagsField || (pin ? pin.tags : undefined),
    aliases: draftValues?.aliasesField || (pin ? pin.aliases?.join(", ") : undefined),
  });
  const { matchingApps, queryMatchingApps } = useAppMatcher();

  const iconList = Object.keys(Icon);
  iconList.unshift("Favicon / File Icon");
  iconList.unshift("None");

  const updatePlaceholderTooltip = async (target: string) => {
    let detectedPlaceholders = await PLChecker.checkForPlaceholders(target, { allPlaceholders: PinsPlaceholders });
    detectedPlaceholders = detectedPlaceholders.filter(
      (placeholder) =>
        target.match(placeholder.regex) != undefined ||
        target.match(new RegExp(`(?<![a-zA-z])${placeholder.name.replaceAll("+", "\\+")}(?! ?[a-zA-z])`)) != undefined,
    );
    setPlaceholderTooltip(
      detectedPlaceholders.length > 0
        ? `\n\nDetected Placeholders:\n${detectedPlaceholders
            .map(
              (placeholder) =>
                `${placeholder.hintRepresentation}: ${placeholder.description}\nExample: ${placeholder.example}`,
            )
            .join("\n\n")}`
        : "",
    );
  };

  return (
    <Form
      enableDrafts={!pin}
      navigationTitle={pin ? `Edit Pin: ${pin.name}` : "New Pin"}
      searchBarAccessory={
        <Form.LinkAccessory
          text="Placeholders Guide"
          target={`file://${path.resolve(environment.assetsPath, "placeholders_guide.md")}`}
        />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={async (values) => {
              const shortcut = { modifiers: values.modifiersField, key: values.keyField };

              if (values.modifiersField.length > 0) {
                // Check if the shortcut is reserved by the extension
                const reservedShortcut = Object.entries(KEYBOARD_SHORTCUT).find(
                  ([, reservedShortcut]) =>
                    shortcut.modifiers.every((modifier: Keyboard.KeyModifier) =>
                      reservedShortcut.modifiers.includes(modifier),
                    ) && reservedShortcut.key == shortcut.key,
                );
                if (reservedShortcut) {
                  setShortcutError(`This shortcut is reserved by the extension! (${reservedShortcut[0]})`);
                  return false;
                }

                // Check if the shortcut is already in use by another pin
                const usedShortcut = pinStore.objects.find(
                  (pin) =>
                    pin.shortcut?.modifiers.every((modifier) => shortcut.modifiers.includes(modifier)) &&
                    pin.shortcut?.key == shortcut.key,
                );
                if (usedShortcut && (!pin || usedShortcut.id != pin.id)) {
                  setShortcutError(`This shortcut is already in use by another pin! (${usedShortcut.name})`);
                  return false;
                }
              }

              let expirationAction = values.expirationActionField || PinAction.DELETE;
              if (expirationAction === PinAction.MOVE) {
                const targetGroup = values.expirationActionDestinationField || "Expired Pins";
                expirationAction = `custom-move:{{movePin:${values.nameField || values.urlField.substring(0, 50)}:${targetGroup}}}`;
              } else if (expirationAction === "custom") {
                expirationAction = `custom:${values.expirationActionCustomField}`;
              }

              if (pin) {
                await pinStore.update([
                  {
                    ...pin,
                    name: values.nameField,
                    url: values.urlField,
                    icon: values.iconField,
                    group: values.groupField || "None",
                    application: values.openWithField,
                    expireDate: values.dateField ? new Date(values.dateField).toUTCString() : undefined,
                    execInBackground: values.execInBackgroundField,
                    fragment: values.fragmentField,
                    iconColor: values.iconColorField,
                    tags: values.tagsField,
                    notes: values.notesField,
                    tooltip: values.tooltipField,
                    visibility: values.visibilityField,
                    expirationAction: expirationAction,
                    shortcut: values.modifiersField.length
                      ? { modifiers: values.modifiersField, key: values.keyField }
                      : undefined,
                    lastOpened: pin.lastOpened,
                    dateCreated: pin.dateCreated ? pin.dateCreated : new Date().toUTCString(),
                    aliases: (values.aliasesField as string)
                      .split(",")
                      .map((alias) => alias.trim())
                      .filter((alias) => alias.length > 0),
                  },
                ]);
                await showToast({ title: `Updated Pin "${values.nameField}"` });
                pop();
              } else {
                const newPin = buildPin({
                  name: values.nameField || values.urlField.substring(0, 50),
                  url: values.urlField,
                  icon: values.iconField,
                  group: values.groupField,
                  application: values.openWithField,
                  expireDate: values.dateField ? new Date(values.dateField).toUTCString() : undefined,
                  execInBackground: values.execInBackgroundField,
                  fragment: values.fragmentField,
                  iconColor: values.iconColorField,
                  tags: values.tagsField,
                  notes: values.notesField,
                  tooltip: values.tooltipField,
                  visibility: values.visibilityField,
                  expirationAction: expirationAction,
                  shortcut: values.modifiersField.length
                    ? { modifiers: values.modifiersField, key: values.keyField }
                    : undefined,
                  aliases: (values.aliasesField as string)
                    .split(",")
                    .map((alias) => alias.trim())
                    .filter((alias) => alias.length > 0),
                });
                await pinStore.add([newPin]);
                await showToast({ title: `Created Pin "${values.nameField}"` });
                pop();
              }
            }}
          />

          <Action.Open
            title="Open Placeholders Guide"
            icon={Icon.Info}
            target={path.resolve(environment.assetsPath, "placeholders_guide.md")}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />

          {pin && <CopyPinActionsSubmenu pin={pin} />}
          {pin && (
            <DeleteItemAction
              item={pin}
              onDelete={async () => await pinStore.remove([pin])}
              options={{ onCompletion: pop }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Pin Name"
        placeholder="Enter pin name, e.g. Google, or leave blank to use target"
        info="The name of the pin as it will appear in the list/menu. If left blank, the first 50 characters of the target (prior to placeholder substitution) will be used."
        defaultValue={draftValues?.nameField || pin?.name}
      />

      <Form.TextArea
        id="urlField"
        title="Target"
        placeholder="Filepath, URL, or script command to pin"
        info={`The target URL, path, script, or text of the pin. Placeholders can be used to insert dynamic values into the target. See the Placeholders Guide (⌘G) for more information.${placeholderTooltip}`}
        error={urlError}
        onChange={async (value) => {
          if (value.startsWith("~")) {
            value = value.replace("~", os.homedir());
          }

          const [, suggestion] = await queryMatchingApps(value, values.application as string);
          await updatePlaceholderTooltip(value);
          setValues({ ...values, url: value, application: draftValues?.openWithField || suggestion });

          if (value.length == 0) {
            setUrlError("Target cannot be empty!");
          } else {
            setUrlError(undefined);
          }
        }}
        defaultValue={draftValues?.urlField || pin?.url}
      />

      <Form.Checkbox
        label="Treat as Text Fragment"
        id="fragmentField"
        info="If checked, the target will be treated as a text fragment, regardless of its format. Text fragments are copied to the clipboard when the pin is opened."
        onChange={(value) => setValues({ ...values, isFragment: value })}
        defaultValue={draftValues?.fragmentField || pin?.fragment || false}
      />

      {!values.isFragment &&
      (values.url as string)?.length != 0 &&
      !(values.url as string)?.startsWith("/") &&
      !(values.url as string)?.startsWith("~") &&
      !(values.url as string)?.match(/^[a-zA-Z0-9]*?:.*/g) ? (
        <Form.Checkbox
          label="Execute in Background"
          id="execInBackgroundField"
          defaultValue={draftValues?.execInBackgroundField || (pin ? pin.execInBackground : false)}
          info="If checked, the pinned Terminal command will be executed in the background instead of in a new Terminal tab."
        />
      ) : null}

      <Form.Dropdown
        id="iconField"
        title="Icon"
        info="The icon displayed next to the pin's name in the list/menu. Favicons and file icons are automatically fetched. When an icon other than Favicon / File Icon is selected, the icon color can be changed."
        defaultValue={draftValues?.iconField || pin?.icon || "Favicon / File Icon"}
        onChange={(value) => setValues({ ...values, icon: value })}
      >
        {iconList.map((iconKey) => {
          const urlIcon = (values.url as string)
            ? (values.url as string).startsWith("/") || (values.url as string).startsWith("~")
              ? { fileIcon: values.url as string }
              : (values.url as string).match(/^[a-zA-Z0-9]*?:.*/g)
                ? getFavicon(values.url as string)
                : Icon.Terminal
            : Icon.Minus;

          return (
            <Form.Dropdown.Item
              key={iconKey}
              title={iconKey}
              value={iconKey}
              icon={
                iconKey in Icon
                  ? getIcon(iconKey, values.iconColor)
                  : iconKey == "Favicon / File Icon"
                    ? urlIcon
                    : Icon.Minus
              }
            />
          );
        })}
      </Form.Dropdown>

      {!values.icon || ["Favicon / File Icon", "None"].includes(values.icon as string) ? null : (
        <Form.Dropdown
          id="iconColorField"
          title="Icon Color"
          info="The color of the Pin's icon when displayed in the list/menu."
          onChange={(value) => setValues({ ...values, iconColor: value })}
          defaultValue={draftValues?.iconColorField || pin?.iconColor || Color.PrimaryText}
        >
          {Object.entries(Color).map(([key, color]) => {
            return (
              <Form.Dropdown.Item
                key={key}
                title={key}
                value={color.toString()}
                icon={{ source: Icon.Circle, tintColor: color }}
              />
            );
          })}
        </Form.Dropdown>
      )}

      {!values.isFragment ? (
        <Form.Dropdown
          title="Open With"
          id="openWithField"
          info="The application to open the pin with"
          value={values?.application || "None"}
          onChange={(value) => {
            setValues({ ...values, application: value });
          }}
        >
          <Form.Dropdown.Item key="None" title="None" value="None" icon={Icon.Minus} />
          {draftValues?.openWithField ? (
            <Form.Dropdown.Item
              key={`app.name${draftValues?.openWithField ? path.basename(draftValues.openWithField, ".app") : ""}`}
              title={draftValues?.openWithField ? path.basename(draftValues.openWithField, ".app") : ""}
              value={draftValues?.openWithField || ""}
              icon={{ fileIcon: draftValues?.openWithField || "/" }}
            />
          ) : null}
          {matchingApps
            .filter(
              (app) => !(draftValues?.openWithField && app.name == path.basename(draftValues.openWithField, ".app")),
            )
            .map((app, idx) => {
              return (
                <Form.Dropdown.Item
                  key={`app.name${idx}`}
                  title={app.name}
                  value={app.path}
                  icon={{ fileIcon: app.path }}
                />
              );
            })}
        </Form.Dropdown>
      ) : null}

      <Form.Dropdown
        id="visibilityField"
        title="Visibility"
        info="Controls the visibility of the pin in the 'View Pins' command and the menu bar dropdown. If set to 'Hidden', you can find the pin by using the 'Show Hidden Pins' action of the 'View Pins' command. Hidden pins can still be opened using deeplinks, while disabled pins cannot be opened at all."
        defaultValue={draftValues?.visibilityField || pin?.visibility || Visibility.USE_PARENT}
      >
        <Form.Dropdown.Item
          key="use_parent"
          title="Use Parent Setting"
          value={Visibility.USE_PARENT}
          icon={Icon.Gear}
        />
        <Form.Dropdown.Item key="visible" title="Visible" value={Visibility.VISIBLE} icon={Icon.Eye} />
        <Form.Dropdown.Item
          key="menubarOnly"
          title="Show in Menubar Only"
          value={Visibility.MENUBAR_ONLY}
          icon={Icon.Window}
        />
        <Form.Dropdown.Item
          key="raycastOnly"
          title="Show in 'View Pins' Only"
          value={Visibility.VIEW_PINS_ONLY}
          icon={Icon.AppWindowList}
        />
        <Form.Dropdown.Item key="hidden" title="Hidden" value={Visibility.HIDDEN} icon={Icon.EyeDisabled} />
        <Form.Dropdown.Item key="disabled" title="Disabled" value={Visibility.DISABLED} icon={Icon.XMarkCircle} />
      </Form.Dropdown>

      {groupStore.objects?.length ? (
        <Form.Dropdown
          id="groupField"
          title="Group"
          defaultValue={draftValues?.groupField || pin?.group || "None"}
          info="The group that this Pin is associated with in the 'View Pins' command and in the menu bar dropdown."
        >
          {[buildGroup({ name: "None" })].concat(groupStore.objects).map((group) => {
            return <Form.Dropdown.Item key={group.name} title={group.name} value={group.name} icon={group.icon} />;
          })}
        </Form.Dropdown>
      ) : null}

      <Form.Separator />

      <Form.TagPicker
        id="tagsField"
        title="Tags"
        info="The tags associated with the pin. Tags can be used to filter pins in the 'View Pins' command."
        value={values.tags}
        onChange={(newValue) => {
          if (newValue.includes("new-tag")) {
            push(
              <TagForm
                onSubmit={(tag) => {
                  setValues({
                    ...values,
                    tags: [...(values.tags?.filter((tag) => tag !== "new-tag") || []), tag.name],
                  });
                }}
              />,
            );
          } else {
            setValues({ ...values, tags: newValue });
          }
        }}
      >
        {tagStore.objects.map((tag) => {
          return (
            <Form.TagPicker.Item
              key={tag.id}
              title={tag.name}
              value={tag.name}
              icon={{ source: Icon.Tag, tintColor: tag.color }}
            />
          );
        })}
        <Form.TagPicker.Item key="new-tag" title="+ New Tag" value="new-tag" />
      </Form.TagPicker>

      <Form.TextField
        id="aliasesField"
        title="Aliases"
        info="The comma-separated list of aliases that can be used to find the pin."
        value={values.aliases}
        onChange={(value) => setValues({ ...values, aliases: value })}
      />

      <Form.TextField
        id="tooltipField"
        title="Tooltip"
        info="The tooltip that is displayed when hovering over the pin in the menu bar dropdown."
        defaultValue={draftValues?.tooltipField || pin?.tooltip}
      />

      <Form.TextArea
        id="notesField"
        title="Notes"
        info="Any additional notes about the pin. Notes are displayed in the 'View Pins' command. Markdown is supported."
        defaultValue={draftValues?.notesField || pin?.notes}
        enableMarkdown={true}
      />

      <Form.Separator />

      <Form.DatePicker
        id="dateField"
        title="Expiration Date"
        info="The date and time at which the pin will be automatically removed"
        defaultValue={draftValues?.dateField || (pin?.expireDate ? new Date(pin.expireDate) : undefined)}
        onChange={(value) => setValues({ ...values, expireDate: value?.toISOString() })}
      />

      {values.expireDate ? (
        <Form.Dropdown
          id="expirationActionField"
          title="Expiration Action"
          info="The action to take when the pin expires"
          defaultValue={
            draftValues?.expirationActionField ||
            (pin
              ? pin.expirationAction?.startsWith("custom")
                ? pin.expirationAction?.startsWith("custom-move")
                  ? "move"
                  : "custom"
                : pin.expirationAction
              : "delete")
          }
          onChange={(value) => setValues({ ...values, expirationAction: value })}
        >
          <Form.Dropdown.Item key="delete" title="Delete" value={PinAction.DELETE} icon={Icon.Trash} />
          <Form.Dropdown.Item key="hide" title="Hide" value={PinAction.HIDE} icon={Icon.EyeDisabled} />
          <Form.Dropdown.Item key="disable" title="Disable" value={PinAction.DISABLE} icon={Icon.XMarkCircle} />
          <Form.Dropdown.Item key="move" title="Move to Group" value={PinAction.MOVE} icon={Icon.Folder} />
          <Form.Dropdown.Item key="custom" title="Custom Action" value="custom" icon={Icon.Gear} />
        </Form.Dropdown>
      ) : null}

      {(values.expirationAction?.startsWith("custom-move") || values.expirationAction === PinAction.MOVE) &&
      values.expireDate ? (
        <Form.Dropdown
          id="expirationActionDestinationField"
          title="Expiration Destination"
          info="The group to move the pin to when it expires"
          defaultValue={
            draftValues?.expirationActionDestinationField || pin?.expirationAction?.startsWith("custom-move")
              ? pin?.expirationAction?.match(/:(.*?):(.*?):(.*?)/)?.[3] || "Expired Pins"
              : "Expired Pins"
          }
        >
          {[{ name: "Expired Pins", icon: "BellDisabled", id: "" } as Group].concat(groupStore.objects).map((group) => {
            return (
              <Form.Dropdown.Item
                key={group.name}
                title={group.name}
                value={group.name}
                icon={group.icon === "None" ? Icon.Minus : getIcon(group.icon, group.iconColor)}
              />
            );
          })}
        </Form.Dropdown>
      ) : null}

      {values.expirationAction === "custom" ? (
        <Form.TextArea
          id="expirationActionCustomField"
          title="Custom Action"
          info="The custom action to take when the pin expires"
          defaultValue={
            draftValues?.expirationActionCustomField ||
            pin?.expirationAction?.replace("custom-move:", "").replace("custom:", "")
          }
        />
      ) : null}

      <Form.Separator />

      <Form.TagPicker
        id="modifiersField"
        title="Keyboard Shortcut Modifiers"
        info="The keyboard modifiers to use for the keyboard shortcut that opens the pin. The combination of modifiers and key must be unique."
        defaultValue={draftValues?.modifiersField || pin?.shortcut?.modifiers}
        error={shortcutError}
        onChange={() => setShortcutError(undefined)}
      >
        <Form.TagPicker.Item key="cmd" title="Command" value="cmd" />
        <Form.TagPicker.Item key="shift" title="Shift" value="shift" />
        <Form.TagPicker.Item key="ctrl" title="Control" value="ctrl" />
        <Form.TagPicker.Item key="alt" title="Option" value="alt" />
      </Form.TagPicker>

      <Form.TextField
        id="keyField"
        title="Keyboard Shortcut Key"
        info="The keyboard key to use for the keyboard shortcut that opens the pin. The combination of modifiers and key must be unique."
        defaultValue={draftValues?.keyField || pin?.shortcut?.key}
        error={shortcutError}
        onChange={() => setShortcutError(undefined)}
      />

      {pin?.id != undefined ? (
        <>
          <Form.Separator />
          <Form.Description title="Statistics" text={getPinStatistics(pin, pinStore.objects) as string} />
        </>
      ) : null}
    </Form>
  );
};
