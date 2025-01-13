import { createContext, useEffect } from "react";
import useLocalObjectStore, { LocalObjectStore, objectStoreDefaultState } from "../hooks/useLocalObjectStore";
import { Tag } from "../lib/tag";
import { useContext } from "react";
import { ItemType, StorageKey } from "../lib/constants";
import { storageMethods } from "../lib/storage";

const TagStoreContext = createContext<LocalObjectStore<Tag>>(objectStoreDefaultState<Tag>());

type TagStoreProviderProps = {
  children: React.ReactNode;
};

function TagStoreProvider(props: TagStoreProviderProps) {
  const { children } = props;
  const tagStore = useLocalObjectStore<Tag>(StorageKey.TAG_STORE, storageMethods);

  useEffect(() => {
    if (!tagStore.loading) {
      tagStore.fillKey("itemType", ItemType.TAG);
    }
  }, [tagStore.loading]);

  return <TagStoreContext.Provider value={tagStore}>{children}</TagStoreContext.Provider>;
}

export default TagStoreProvider;

export function useTagStoreContext() {
  return useContext(TagStoreContext);
}
