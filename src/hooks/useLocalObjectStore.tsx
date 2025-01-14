import { randomUUID } from "crypto";
import { useCallback, useEffect, useRef, useState } from "react";

type LocalObjectStoreKey = `local-${Lowercase<string>}`;

type StorageFns<T> = {
  /**
   * Function to set the value of a key in storage. This can be used to customize where and how the store is saved.
   */
  setItem: (key: string, value: string) => Promise<void>;

  /**
   * Function to get the value of a key in storage. This can be used to customize where and how values in the store are retrieved.
   */
  getItem: (key: string) => Promise<string | undefined>;

  /**
   * Function to remove a key from storage. This can be used to customize how keys are removed from the store.
   */
  removeItem: (key: string) => Promise<void>;

  /**
   * Function to update state. Supply this argument if you want to use custom state management, e.g. if you're using a cached state hook.
   */
  useState?: (
    key: string,
    initialValue: LocalObjectType<T>[],
  ) => [LocalObjectType<T>[], (value: LocalObjectType<T>[]) => void];

  /**
   * Function to generate a new ID for an object. Supply this argument if you want to use custom ID generation. The default is a UUID.
   */
  getNextID?: () => string;
};

type LocalObjectStoreArgs<T> = [
  /**
   * The key to use for the store. This is used to identify the store in local storage.
   */
  key: LocalObjectStoreKey,

  /**
   * The functions to use for storing and retrieving values from storage (local or otherwise).
   */
  storageFunctions: StorageFns<T>,
];

export type LocalObjectType<T> = T & { id: LocalObjectID };

export type LocalObjectMap<T> = Map<T[keyof T], LocalObjectType<T>>;

export type LocalObjectStore<T> = {
  /**
   * The objects in the store.
   */
  objects: LocalObjectType<T>[];

  /**
   * Loads objects from storage. Validates objects to ensure they have unique IDs.
   * @returns A promise that resolves when the objects have been loaded.
   */
  load: () => Promise<void>;

  /**
   * Whether the store is currently loading objects.
   */
  loading: boolean;

  /**
   * Saves the active list of objects to storage.
   * @param newObjects The objects to save.
   * @returns A promise that resolves when the objects have been saved.
   */
  save: (newObjects: LocalObjectType<T>[]) => Promise<void>;

  /**
   * Sorts the active list of objects using the provided comparison function.
   * @param compareFn Function to compare two objects. See {@link Array.sort}.
   * @param commit Whether to save the updated list to storage.
   * @returns A promise that resolves when the objects have been sorted (and saved, if applicable).
   */
  sort: (compareFn: (a: LocalObjectType<T>, b: LocalObjectType<T>) => number, commit?: boolean) => Promise<void>;

  /**
   * Adds new objects to the store.
   * @param newObjects An array of objects to add.
   * @param commit Whether to save the updated list to storage.
   * @returns A promise resolving to an array of the added objects (now with assigned IDs).
   */
  add: (newObjects: T[], commit?: boolean) => Promise<LocalObjectType<T>[]>;

  /**
   * Updates an object in the store.
   * @param object The object to update, with its new values. The ID must match the ID of an existing object in the store.
   * @param commit Whether to save the updated list to storage.
   * @returns A promise that resolves when the object has been updated (and saved, if applicable).
   */
  update: (object: LocalObjectType<T>, commit?: boolean) => Promise<void>;

  /**
   * Moves an object to a new index in the store.
   * @param object The object to move.
   * @param targetIndex The index to move the object to.
   * @param commit Whether to save the updated list to storage.
   * @returns A promise that resolves when the object has been moved (and saved, if applicable).
   */
  move: (object: LocalObjectType<T>, targetIndex: number, commit?: boolean) => Promise<void>;

  /**
   * Removes an object from the store, if it exists.
   * @param object The object to remove.
   * @param commit Whether to save the updated list to storage.
   * @returns A promise that resolves when the object has been removed (and saved, if applicable).
   */
  remove: (object: LocalObjectType<T>, commit?: boolean) => Promise<void>;

  /**
   * Removes all objects from the store.
   * @param commit Whether to save the updated list to storage.
   * @returns A promise that resolves when all objects have been removed (and saved, if applicable).
   */
  clear: (commit?: boolean) => Promise<void>;

  /**
   * Deduplicates objects in the store based on the provided keys. If the values of all requested keys match, the objects are considered duplicates. The first object with a given set of values is kept, and the rest are removed.
   * @param keys The keys to use for deduplication.
   * @param merge Function to merge two objects. If provided, this function is used to merge object values instead of completely removing all but the first object.
   * @param commit Whether to save the updated list to storage.
   * @returns A promise resolving to an object with the remaining objects, removed objects, and duplicate groups.
   */
  deduplicate: (
    keys: (keyof T)[],
    merge?: (a: LocalObjectType<T>, b: LocalObjectType<T>) => LocalObjectType<T>,
    commit?: boolean,
  ) => Promise<{
    /**
     * The objects that remain after deduplication.
     */
    remainingObjects: LocalObjectType<T>[];

    /**
     * The objects that were removed during deduplication.
     */
    removedObjects: LocalObjectType<T>[];

    /**
     * The groups of objects that were considered duplicates.
     */
    duplicateGroups: { [key: string]: LocalObjectType<T>[] };
  }>;

  /**
   * Converts the objects in the store to a map, using the values of the provided object key as the map keys.
   * @param key The object key to use as the map key.
   * @returns A map of the objects in the store, with the provided key as the map key.
   */
  toMap: (key: keyof T) => LocalObjectMap<T>;

  /**
   * Updates the value of the given key for every object in the store.
   * @param key The key to update.
   * @param value The new value for the key.
   * @param commit Whether to save the updated list to storage.
   * @returns A promise that resolves when the objects have been updated (and saved, if applicable).
   */
  fillKey: (key: keyof T, value: T[keyof T], commit?: boolean) => Promise<void>;
};

export function objectStoreDefaultState<T>(): LocalObjectStore<T> {
  return {
    objects: [],
    loading: true,
    load: async () => {},
    save: async () => {},
    add: async () => [],
    update: async () => {},
    move: async () => {},
    remove: async () => {},
    deduplicate: async () => ({ remainingObjects: [], duplicateGroups: {}, removedObjects: [] }),
    clear: async () => {},
    sort: async () => {},
    toMap: () => new Map(),
    fillKey: async () => {},
  };
}

type LocalObjectID = string | number;

export async function getObjectsFromStore<T>(...args: LocalObjectStoreArgs<T>) {
  const [key, storageFunctions] = args;
  const items = await storageFunctions.getItem(key);
  const loadedObjects: LocalObjectType<T>[] = items ? JSON.parse(items) : [];

  const ids = new Set<LocalObjectID>();
  const validatedObjects = loadedObjects.map((object) => {
    if (ids.has(object.id)) {
      object.id = storageFunctions.getNextID ? storageFunctions.getNextID() : randomUUID();
    }
    ids.add(object.id);
    return object;
  });
  return validatedObjects;
}

export async function addObjectsToStore<T>(
  key: LocalObjectStoreKey,
  objects: LocalObjectType<T>[], // TODO: Swap this and newObjects
  newObjects: T[],
  storageFunctions: StorageFns<T>,
  commit = true,
) {
  if (!newObjects.length) {
    return [];
  }
  const processedObjects = newObjects.map((object) => ({
    ...object,
    id: storageFunctions.getNextID ? storageFunctions.getNextID() : randomUUID(),
  }));
  if (commit) {
    await storageFunctions.setItem(key, JSON.stringify([...objects, ...processedObjects]));
  }
  return processedObjects;
}

export async function updateObjectInStore<T>(
  objects: LocalObjectType<T>[], // TODO: Swap this and object
  object: LocalObjectType<T>,
  commit = true,
  ...args: LocalObjectStoreArgs<T>
) {
  const [key, storageFunctions] = args;
  const processedObjects = objects.map((existingObject) => (existingObject.id === object.id ? object : existingObject));
  if (commit) {
    await storageFunctions.setItem(key, JSON.stringify(processedObjects));
  }
}

export async function removeObjectsFromStore<T>(
  objects: LocalObjectType<T>[],
  storeObjects: LocalObjectType<T>[],
  commit = true,
  ...args: LocalObjectStoreArgs<T>
) {
  const [key, storageFunctions] = args;
  const remainingObjects = storeObjects.filter((someObject) => objects.every((object) => object.id !== someObject.id));
  if (commit) {
    await storageFunctions.setItem(key, JSON.stringify(remainingObjects));
  }
}

export async function clearObjectsInStore<T>(commit = true, ...args: LocalObjectStoreArgs<T>) {
  const [key, storageFunctions] = args;
  if (commit) {
    await storageFunctions.setItem(key, JSON.stringify([]));
  }
}

// enum StoreOperationStage {
//   INIT,
//   LOADING,
//   LOADED,
//   STANDBY,
//   SAVING,
//   SAVED,
//   ADDING,
//   ADDED,
//   UPDATING,
//   UPDATED,
//   REMOVING,
//   REMOVED,
//   CLEARING,
//   CLEARED,
//   DEDUPLICATING,
//   DEDUPLICATED,
//   SORTING,
//   SORTED,
// }

export default function useLocalObjectStore<T>(...args: LocalObjectStoreArgs<T>): LocalObjectStore<T> {
  const [key, storageFunctions] = args;

  const [objects, setObjects] = storageFunctions.useState
    ? storageFunctions.useState(key, [])
    : useState<LocalObjectType<T>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const stage = useRef(0);

  // const log = (...messages: unknown[]) =>
  //   debugLog(`[LocalObjectStore:${key}, stage:${StoreOperationStage[stage.current]}]`, ...messages);

  const validate = useCallback(
    (loadedObjects: LocalObjectType<T>[]) => {
      // Ensure all objects have a unique ID, assigning new IDs as needed.
      // log(`Validating objects...`);
      const ids = new Set<LocalObjectID>();
      const newObjects = loadedObjects.map((object) => {
        if (ids.has(object.id)) {
          // log(`Object ${object.id} is not unique. Assigning new ID.`);
          object.id = storageFunctions.getNextID ? storageFunctions.getNextID() : randomUUID();
        }
        ids.add(object.id);
        return object;
      });
      // log(`Finished validating objects.`);
      return newObjects;
    },
    [storageFunctions],
  );

  const load = useCallback(async () => {
    // log(`Loading objects from storage...`);
    // stage.current = StoreOperationStage.LOADING;
    const items = await storageFunctions.getItem(key);
    const loadedObjects: LocalObjectType<T>[] = items ? JSON.parse(items) : [];
    const validatedObjects = validate(loadedObjects);
    console.log("VALIDATED", validatedObjects);
    setObjects(validatedObjects);
    setLoading(false);
    // stage.current = StoreOperationStage.LOADED;
    // log(`Loaded ${validatedObjects.length} objects.`);
  }, [validate, storageFunctions]);

  const save = useCallback(
    async (newObjects: LocalObjectType<T>[]) => {
      // log(`Saving objects...`);
      // stage.current = StoreOperationStage.SAVING;
      await storageFunctions.setItem(key, JSON.stringify(newObjects));
      // stage.current = StoreOperationStage.SAVED;
      // log(`Saved ${objects.length} objects.`);
    },
    [storageFunctions],
  );

  const sort = useCallback(
    async (compareFn: (a: LocalObjectType<T>, b: LocalObjectType<T>) => number, commit = true) => {
      // log(`Sorting objects...`);
      // stage.current = StoreOperationStage.SORTING;
      const sortedObjects = [...objects].sort(compareFn);
      setObjects(sortedObjects);
      if (commit) {
        await save(sortedObjects);
      }
      // stage.current = StoreOperationStage.SORTED;
      // log(`Finished sorting objects.`);
    },
    [objects, save],
  );

  const remove = useCallback(
    // TODO: Allow for multiple objects to be removed at once
    async (object: LocalObjectType<T>, commit = true) => {
      // log(`Removing object ${object.id}...`);
      // stage.current = StoreOperationStage.REMOVING;
      const remainingObjects = objects.filter((someObject) => someObject.id !== object.id);
      setObjects(remainingObjects);
      if (commit) {
        await save(remainingObjects);
      }
      // stage.current = StoreOperationStage.REMOVED;
      // log(`Finished removing object ${object.id}.`);
    },
    [objects, save],
  );

  const clear = useCallback(
    async (commit = true) => {
      // log(`Clearing objects...`);
      // stage.current = StoreOperationStage.CLEARING;
      setObjects([]);
      if (commit) {
        await save([]);
      }
      // stage.current = StoreOperationStage.CLEARED;
      // log(`Finished clearing objects.`);
    },
    [save],
  );

  const add = useCallback(
    async (newObjects: T[], commit = true) => {
      if (!newObjects.length) {
        return [];
      }
      // log(`Adding ${newObjects.length} objects...`);
      // stage.current = StoreOperationStage.ADDING;
      const processedObjects = newObjects.map((object) => ({
        ...object,
        id: storageFunctions.getNextID ? storageFunctions.getNextID() : randomUUID(),
      }));
      setObjects([...objects, ...processedObjects]);
      if (commit) {
        await save([...objects, ...processedObjects]);
      }
      // stage.current = StoreOperationStage.ADDED;
      // log(`Finished adding ${newObjects.length} objects.`);
      return processedObjects;
    },
    [objects, save, storageFunctions],
  );

  const update = useCallback(
    async (object: LocalObjectType<T>, commit = true) => {
      // log(`Updating object ${object.id}...`);
      // stage.current = StoreOperationStage.UPDATING;
      const processedObjects = objects.map((existingObject) =>
        existingObject.id === object.id ? object : existingObject,
      );
      setObjects(processedObjects);
      if (commit) {
        await save(processedObjects);
      }
      // stage.current = StoreOperationStage.UPDATED;
      // log(`Finished updating object ${object.id}.`);
    },
    [objects, save],
  );

  const move = useCallback(
    async (object: LocalObjectType<T>, targetIndex: number, commit = true) => {
      // log(`Moving object ${object.id}...`);
      // stage.current = StoreOperationStage.UPDATING;
      const oldObjects = [...objects];
      oldObjects.splice(targetIndex, 0, oldObjects.splice(oldObjects.indexOf(object), 1)[0]);
      setObjects(oldObjects);
      if (commit) {
        await save(oldObjects);
      }
      // stage.current = StoreOperationStage.UPDATED;
      // log(`Finished moving object ${object.id}.`);
    },
    [objects, save],
  );

  const deduplicate = useCallback(
    async (
      keys: (keyof T)[],
      merge?: (...similarObjects: LocalObjectType<T>[]) => LocalObjectType<T>,
      commit = true,
    ) => {
      // log(`Starting deduplication...`);
      // log(`Grouping duplicates by keys: ${keys.join(", ")}...`);
      // stage.current = StoreOperationStage.DEDUPLICATING;
      const duplicateGroups = objects.reduce(
        (groups, object) => {
          const groupName = keys.map((key) => object[key]).join(",");
          groups[groupName] = groups[groupName] || [];
          groups[groupName].push(object);
          return groups;
        },
        {} as { [key: string]: LocalObjectType<T>[] },
      );
      // log(`Found ${Object.keys(duplicateGroups).length} groups of duplicates.`);

      // log(merge ? "Merging duplicates..." : "Removing duplicates...");
      const removedObjects: LocalObjectType<T>[] = [];
      const remainingObjects = Object.values(duplicateGroups).map((group) => {
        if (group.length > 1) {
          const [firstObject, ...rest] = group;
          removedObjects.push(...rest);
          if (merge) {
            return merge(firstObject, ...rest);
          }
          return firstObject;
        }
        return group[0];
      });

      setObjects(remainingObjects);
      if (commit) {
        await save(remainingObjects);
      }
      // stage.current = StoreOperationStage.DEDUPLICATED;
      // log(`Finished deduplication.`);
      return {
        remainingObjects,
        removedObjects,
        duplicateGroups,
      };
    },
    [objects, save],
  );

  const toMap = useCallback(
    (key: keyof T) => {
      const objectMap = new Map<T[keyof T], LocalObjectType<T>>();
      if (!objects.length) {
        return objectMap;
      }

      const sampleObject = objects[0];
      if (!sampleObject[key]) {
        throw new Error(`Object does not have a property named ${String(key)}.`);
      }

      objects.forEach((object) => {
        objectMap.set(object[key], object);
      });

      return objectMap;
    },
    [objects],
  );

  const fillKey = useCallback(
    async (key: keyof T, value: T[keyof T], commit = true) => {
      // log(`Filling key ${String(key)} with value ${value}...`);
      // stage.current = StoreOperationStage.UPDATING;
      const processedObjects = objects.map((object) => ({ ...object, [key]: value }));
      setObjects(processedObjects);
      if (commit) {
        await save(processedObjects);
      }
      // stage.current = StoreOperationStage.UPDATED;
      // log(`Finished filling key ${String(key)}.`);
    },
    [objects, save],
  );

  useEffect(() => {
    if (stage.current === 0) {
      stage.current = 1;
      // stage.current = StoreOperationStage.LOADING;
      load();
    }
  }, [loading]);
  // }, [loading, stage.current]);

  return {
    objects,
    load,
    loading,
    save,
    sort,
    add,
    update,
    move,
    remove,
    clear,
    deduplicate,
    toMap,
    fillKey,
  };
}
