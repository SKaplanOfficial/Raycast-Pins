import { LaunchProps } from "@raycast/api";
import GroupForm, { GroupFormValues } from "./components/GroupForm";

/**
 * Raycast command for creating a new pin group.
 */
export default function NewGroupCommand(props: LaunchProps<{ draftValues: GroupFormValues }>) {
  const { draftValues } = props;
  return <GroupForm draftValues={draftValues} />;
}
