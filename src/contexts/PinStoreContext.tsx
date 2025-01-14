import { createContext, useEffect } from "react";
import useLocalObjectStore, { LocalObjectStore, objectStoreDefaultState } from "../hooks/useLocalObjectStore";
import { useContext } from "react";
import { StorageKey } from "../lib/constants";
import { getStorage, storageMethods } from "../lib/storage";
import { Pin } from "../lib/Pins";
import { Tag, upgradeTags } from "../lib/tag";
import { LocalStorage } from "@raycast/api";

const PinStoreContext = createContext<LocalObjectStore<Pin>>(objectStoreDefaultState<Pin>());

type PinStoreProviderProps = {
  children: React.ReactNode;
};

function PinStoreProvider(props: PinStoreProviderProps) {
  const { children } = props;
  const pinStore = useLocalObjectStore<Pin>(StorageKey.PIN_STORE, storageMethods);
  const tagStore = useLocalObjectStore<Tag>(StorageKey.TAG_STORE, storageMethods);

  async function migratePins() {
    const oldPins: Pin[] = await getStorage(StorageKey.LOCAL_PINS);
    if (oldPins) {
      await LocalStorage.removeItem(StorageKey.LOCAL_PINS);
      await pinStore.add(oldPins);
      const pinTags = oldPins
        .map((pin) => pin.tags)
        .flat()
        .filter((tag) => tag != undefined);
      upgradeTags(pinTags, tagStore);
    }
  }

  useEffect(() => {
    if (!pinStore.loading && pinStore.objects.length === 0) {
      migratePins();
    }
  }, [pinStore.loading, pinStore.objects]);

  return <PinStoreContext.Provider value={pinStore}>{children}</PinStoreContext.Provider>;
}

export default PinStoreProvider;

export function usePinStoreContext() {
  return useContext(PinStoreContext);
}
