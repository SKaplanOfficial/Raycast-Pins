import { createContext, useEffect } from "react";
import useLocalObjectStore, { objectStoreDefaultState } from "../hooks/useLocalObjectStore";
import { Tag, upgradeTags, validateTags } from "../lib/tag";
import { useContext } from "react";
import { StorageKey } from "../lib/common";
import { getStorage, storageMethods } from "../lib/storage";
import { Pin, validatePins } from "../lib/pin";
import { Group, validateGroups } from "../lib/Groups";
import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

const dataStoreDefaultState = {
  pinStore: objectStoreDefaultState<Pin>(),
  groupStore: objectStoreDefaultState<Group>(),
  tagStore: objectStoreDefaultState<Tag>(),
};

const DataStorageContext = createContext(dataStoreDefaultState);

type AssociationsDict = {
  groups: {
    [key: string]: Group & { pins: Pin[] };
  };
  tags: {
    [key: string]: Tag & { pins: Pin[] } & { groups: Group[] };
  };
};

function DataStorageProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const pinStore = useLocalObjectStore<Pin>(StorageKey.PIN_STORE, storageMethods, validatePins);
  const groupStore = useLocalObjectStore<Group>(StorageKey.GROUP_STORE, storageMethods, validateGroups);
  const tagStore = useLocalObjectStore<Tag>(StorageKey.TAG_STORE, storageMethods, validateTags);
  const [associations, setAssociations] = useCachedState<AssociationsDict>("data-associations", {
    groups: {},
    tags: {},
  });

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

  function findAssociations() {
    const groups = groupStore.objects.reduce(
      (acc, group) => {
        const pinsInGroup = pinStore.objects.filter((pin) => pin.group == group.name);
        acc[group.id] = { ...group, pins: pinsInGroup };
        return acc;
      },
      {} as { [key: string]: Group & { pins: Pin[] } },
    );

    const tags = tagStore.objects.reduce(
      (acc, tag) => {
        const pinsWithTag = pinStore.objects.filter((pin) => pin.tags?.includes(tag.name));
        const groupsWithTag = groupStore.objects.filter((group) => group.tags?.includes(tag.name));
        acc[tag.id] = { ...tag, pins: pinsWithTag, groups: groupsWithTag };
        return acc;
      },
      {} as { [key: string]: Tag & { pins: Pin[] } & { groups: Group[] } },
    );

    setAssociations({ groups, tags });
  }

  useEffect(() => {
    if (!pinStore.loading) {
      if (pinStore.objects.length === 0) {
        migratePins();
      }
    }
  }, [pinStore.loading, pinStore.objects]);

  const dataStore = {
    pinStore,
    groupStore,
    tagStore,
  };

  return <DataStorageContext.Provider value={dataStore}>{children}</DataStorageContext.Provider>;
}

export default DataStorageProvider;

export function useDataStorageContext() {
  return useContext(DataStorageContext);
}
