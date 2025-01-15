import { LaunchProps } from "@raycast/api";
import { PinForm, PinFormValues } from "./components/PinForm";
import DataStorageProvider from "./contexts/DataStorageContext";

/**
 * Raycast command for creating a new pin.
 */
export default function NewPinCommand(props: LaunchProps<{ draftValues: PinFormValues }>) {
  const draftValues = props.draftValues;
  return (
    <DataStorageProvider>
      <PinForm draftValues={draftValues} />
    </DataStorageProvider>
  );
}
