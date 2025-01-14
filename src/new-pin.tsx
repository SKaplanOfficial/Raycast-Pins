import { LaunchProps } from "@raycast/api";
import { PinForm, PinFormValues } from "./components/PinForm";
import PinStoreProvider, { usePinStoreContext } from "./contexts/PinStoreContext";
import TagStoreProvider, { useTagStoreContext } from "./contexts/TagStoreContext";

export function NewPinView(props: LaunchProps<{ draftValues: PinFormValues }>) {
  const draftValues = props.draftValues;
  const pinStore = usePinStoreContext();
  const tagStore = useTagStoreContext();
  return <PinForm draftValues={draftValues} pinStore={pinStore} tagStore={tagStore} />;
}

/**
 * Raycast command for creating a new pin.
 */
export default function NewPinCommand(props: LaunchProps<{ draftValues: PinFormValues }>) {
  return (
    <PinStoreProvider>
      <TagStoreProvider>
        <NewPinView {...props} />
      </TagStoreProvider>
    </PinStoreProvider>
  );
}
