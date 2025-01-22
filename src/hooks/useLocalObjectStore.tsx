import { randomUUID } from "crypto";
import { useCallback, useEffect, useRef, useState } from "react";

type LocalObjectStoreKey = `local-${Lowercase<string>}-store`;

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

  // TODO: comment
  validationFn?: (objects: LocalObjectType<T>[]) => LocalObjectType<T>[],
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
   * Updates objects in the store with new values.
   * @param objectsToUpdate The list of objects to update.
   * @param commit Whether to save the updated list to storage.
   * @returns A promise that resolves when the object has been updated (and saved, if applicable).
   */
  update: (objectsToUpdate: LocalObjectType<T>[], commit?: boolean) => Promise<void>;

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
  remove: (object: LocalObjectType<T>[], commit?: boolean) => Promise<void>;

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

type LocalObjectID = string;

export async function getStoredObjects<T>(...args: LocalObjectStoreArgs<T>) {
  const [key, storageFunctions, validationFn] = args;
  const items = await storageFunctions.getItem(key);
  const loadedObjects: LocalObjectType<T>[] = items ? JSON.parse(items) : [];

  const ids = new Set<LocalObjectID>();
  const processedObjects = loadedObjects.map((object) => {
    if (!object.id || ids.has(object.id)) {
      object.id = storageFunctions.getNextID ? storageFunctions.getNextID() : randomUUID();
    }
    ids.add(object.id);
    return object;
  });
  const validatedObjects = validationFn ? validationFn(processedObjects) : processedObjects;
  return validatedObjects;
}

export async function saveObjects<T extends { id?: string }>(
  newObjects: T[],
  storedObjects: LocalObjectType<T>[],
  ...args: LocalObjectStoreArgs<T>
) {
  const [key, storageFunctions, validationFn] = args;
  if (!newObjects.length) {
    return [];
  }
  const processedObjects = newObjects.map((object) => ({
    ...object,
    id: object.id || (storageFunctions.getNextID ? storageFunctions.getNextID() : randomUUID()),
  }));
  const validatedObjects = validationFn ? validationFn(processedObjects) : processedObjects;
  await storageFunctions.setItem(key, JSON.stringify([...storedObjects, ...validatedObjects]));
  return validatedObjects;
}

/**
 * Updates objects in the store with new values.
 * @param objects The objects to update.
 * @param storedObjects All objects currently in the store.
 * @param args The key and storage functions to use.
 * @returns A promise that resolves when the objects have been updated.
 */
export async function updateStoredObjects<T>(
  objects: LocalObjectType<T>[],
  storedObjects: LocalObjectType<T>[],
  ...args: LocalObjectStoreArgs<T>
) {
  const [key, storageFunctions, validationFn] = args;
  const processedObjects = storedObjects.map(
    (existingObject) => objects.find((object) => object.id === existingObject.id) || existingObject,
  );
  const validatedObjects = validationFn ? validationFn(processedObjects) : processedObjects;
  await storageFunctions.setItem(key, JSON.stringify(validatedObjects));
}

// TODO: comment
export async function removeStoredObjects<T>(
  objects: LocalObjectType<T>[],
  storeObjects: LocalObjectType<T>[],
  ...args: LocalObjectStoreArgs<T>
) {
  const [key, storageFunctions] = args;
  const remainingObjects = storeObjects.filter((someObject) => objects.every((object) => object.id !== someObject.id));
  await storageFunctions.setItem(key, JSON.stringify(remainingObjects));
}

export async function clearStoredObjects<T>(...args: LocalObjectStoreArgs<T>) {
  const [key, storageFunctions] = args;
  await storageFunctions.setItem(key, JSON.stringify([]));
}

export default function useLocalObjectStore<T>(...args: LocalObjectStoreArgs<T>): LocalObjectStore<T> {
  const [key, storageFunctions, validationFn] = args;

  const [objects, setObjects] = storageFunctions.useState
    ? storageFunctions.useState(key, [])
    : useState<LocalObjectType<T>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const stage = useRef(0);

  const validate = useCallback(
    (loadedObjects: LocalObjectType<T>[]) => {
      const ids = new Set<LocalObjectID>();
      const processedObjects = loadedObjects.map((object) => {
        if (!object.id || ids.has(object.id)) {
          object.id = storageFunctions.getNextID ? storageFunctions.getNextID() : randomUUID();
        }
        ids.add(object.id);
        return object;
      });
      const validatedObjects = validationFn ? validationFn(processedObjects) : processedObjects;
      return validatedObjects;
    },
    [storageFunctions],
  );

  const load = useCallback(async () => {
    const items = await storageFunctions.getItem(key);
    const loadedObjects: LocalObjectType<T>[] = items ? JSON.parse(items) : [];
    const validatedObjects = validate(loadedObjects);
    setObjects(validatedObjects);
    setLoading(false);
  }, [validate, storageFunctions]);

  const save = useCallback(
    async (newObjects: LocalObjectType<T>[]) => {
      const validatedObjects = validate(newObjects);
      await storageFunctions.setItem(key, JSON.stringify(validatedObjects));
    },
    [storageFunctions],
  );

  const sort = useCallback(
    async (compareFn: (a: LocalObjectType<T>, b: LocalObjectType<T>) => number, commit = true) => {
      const sortedObjects = [...objects].sort(compareFn);
      setObjects(sortedObjects);
      if (commit) {
        await save(sortedObjects);
      }
    },
    [objects, save],
  );

  const remove = useCallback(
    async (objectsToRemove: LocalObjectType<T>[], commit = true) => {
      const remainingObjects = objects.filter((someObject) => objectsToRemove.every((object) => object.id !== someObject.id));
      setObjects(remainingObjects);
      if (commit) {
        await save(remainingObjects);
      }
    },
    [objects, save],
  );

  const clear = useCallback(
    async (commit = true) => {
      setObjects([]);
      if (commit) {
        await save([]);
      }
    },
    [save],
  );

  const add = useCallback(
    async (newObjects: T[], commit = true) => {
      if (!newObjects.length) {
        return [];
      }
      const processedObjects = newObjects.map((object) => ({
        ...object,
        id: storageFunctions.getNextID ? storageFunctions.getNextID() : randomUUID(),
      }));
      const validatedObjects = validationFn ? validationFn(processedObjects) : processedObjects;
      setObjects([...objects, ...validatedObjects]);
      if (commit) {
        await save([...objects, ...validatedObjects]);
      }
      return validatedObjects;
    },
    [objects, save, storageFunctions],
  );

  const update = useCallback(
    async (objectsToUpdate: LocalObjectType<T>[], commit = true) => {
      const processedObjects = objects.map(
        (existingObject) => objectsToUpdate.find((object) => object.id === existingObject.id) || existingObject,
      );
      const validatedObjects = validationFn ? validationFn(processedObjects) : processedObjects;
      setObjects(validatedObjects);
      if (commit) {
        await save(validatedObjects);
      }
    },
    [objects, save],
  );

  const move = useCallback(
    async (object: LocalObjectType<T>, targetIndex: number, commit = true) => {
      const oldObjects = [...objects];
      oldObjects.splice(targetIndex, 0, oldObjects.splice(oldObjects.indexOf(object), 1)[0]);
      setObjects(oldObjects);
      if (commit) {
        await save(oldObjects);
      }
    },
    [objects, save],
  );

  const deduplicate = useCallback(
    async (
      keys: (keyof T)[],
      merge?: (...similarObjects: LocalObjectType<T>[]) => LocalObjectType<T>,
      commit = true,
    ) => {
      const duplicateGroups = objects.reduce(
        (groups, object) => {
          const groupName = keys.map((key) => object[key]).join(",");
          groups[groupName] = groups[groupName] || [];
          groups[groupName].push(object);
          return groups;
        },
        {} as { [key: string]: LocalObjectType<T>[] },
      );

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
      const processedObjects = objects.map((object) => ({ ...object, [key]: value }));
      setObjects(processedObjects);
      if (commit) {
        await save(processedObjects);
      }
    },
    [objects, save],
  );

  useEffect(() => {
    if (stage.current === 0) {
      stage.current = 1;
      load();
    }
  }, [loading]);

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
