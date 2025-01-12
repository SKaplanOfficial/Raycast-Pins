import { createContext } from "react";
import useLocalObjectStore, { LocalObjectStore, objectStoreDefaultState } from "../hooks/useLocalObjectStore";
import { Tag } from "../lib/tag";
import { useContext } from "react";
import { StorageKey } from "../lib/constants";
import { storageMethods } from "../lib/storage";

const TagStoreContext = createContext<LocalObjectStore<Tag>>(objectStoreDefaultState<Tag>());

type TagStoreProviderProps = {
  children: React.ReactNode;
};

function TagStoreProvider(props: TagStoreProviderProps) {
  const { children } = props;
  const tagStore = useLocalObjectStore<Tag>(StorageKey.TAG_STORE, storageMethods);
  return <TagStoreContext.Provider value={tagStore}>{children}</TagStoreContext.Provider>;
}

export default TagStoreProvider;

export function useTagStoreContext() {
  return useContext(TagStoreContext);
}
