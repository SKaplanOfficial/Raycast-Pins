import { LaunchProps } from "@raycast/api";
import GroupForm, { GroupFormValues } from "./components/GroupForm";
import DataStorageProvider from "./contexts/DataStorageContext";

export default function NewGroupCommand(props: LaunchProps<{ draftValues: GroupFormValues }>) {
  const { draftValues } = props;
  return (
    <DataStorageProvider>
      <GroupForm draftValues={draftValues} />
    </DataStorageProvider>
  );
}
