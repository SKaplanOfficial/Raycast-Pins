import { createContext, useEffect, useMemo, useState } from "react";
import useLocalObjectStore, { objectStoreDefaultState } from "../hooks/useLocalObjectStore";
import { Tag, upgradeTags, validateTags } from "../lib/tag";
import { useContext } from "react";
import { getStorage, storageMethods } from "../lib/storage";
import { Pin, validatePins } from "../lib/pin";
import { Group, validateGroups } from "../lib/group";
import { LocalStorage } from "@raycast/api";
import { storageKeys } from "../lib/common";

const dataStoreDefaultState = {
  pinStore: objectStoreDefaultState<Pin>(),
  groupStore: objectStoreDefaultState<Group>(),
  tagStore: objectStoreDefaultState<Tag>(),
  tagAssociations: {} as { [key: string]: { pins: string[] } },
  loadingStores: true,
};

const DataStorageContext = createContext(dataStoreDefaultState);

function DataStorageProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const pinStore = useLocalObjectStore<Pin>(storageKeys.pinStore, storageMethods, validatePins);
  const groupStore = useLocalObjectStore<Group>(storageKeys.groupStore, storageMethods, validateGroups);
  const tagStore = useLocalObjectStore<Tag>(storageKeys.tagStore, storageMethods, validateTags);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [loadingStores, setLoadingStores] = useState(true);
  const [tagAssociations, setTagAssociations] = useState(dataStoreDefaultState.tagAssociations);

  useEffect(() => {
    async function migratePins() {
      const oldPins: Pin[] = await getStorage(storageKeys.oldPinList);
      if (oldPins) {
        await LocalStorage.removeItem(storageKeys.oldPinList);
        await pinStore.add(oldPins);
        const pinTags = oldPins
          .map((pin) => pin.tags)
          .flat()
          .filter((tag) => tag != undefined);
        await upgradeTags(pinTags, tagStore);
      }
      setMigrationComplete(true);
    }

    if (!pinStore.loading) {
      migratePins();
    }
  }, [pinStore.loading, pinStore.objects]);

  useEffect(() => {
    if (!pinStore.loading && !groupStore.loading && !tagStore.loading && migrationComplete) {
      const associations = tagStore.objects.reduce(
        (acc, tag) => {
          pinStore.objects.forEach((pin) => {
            if (pin.tags?.includes(tag.name)) {
              acc[tag.name] = acc[tag.name] || { pins: [] };
              acc[tag.name].pins.push(pin.id);
            }
          });
          return acc;
        },
        {} as { [key: string]: { pins: string[] } },
      );
      setTagAssociations(associations);
      setLoadingStores(false);
    }
  }, [pinStore.loading, groupStore.loading, tagStore.loading, migrationComplete]);

  const dataStore = useMemo(
    () => ({
      pinStore,
      groupStore,
      tagStore,
      tagAssociations,
      loadingStores,
    }),
    [pinStore, groupStore, tagStore, loadingStores],
  );

  return <DataStorageContext.Provider value={dataStore}>{children}</DataStorageContext.Provider>;
}

export default DataStorageProvider;

export function useDataStorageContext() {
  return useContext(DataStorageContext);
}
