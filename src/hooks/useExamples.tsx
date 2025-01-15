import { useEffect, useState } from "react";
import { ItemType, StorageKey } from "../lib/common";
import { getStorage } from "../lib/storage";

/**
 * Hook to check if examples are installed, and to install them if they are not.
 * @param types The types of examples to check for (e.g. pins, groups).
 * @returns An object with the examplesInstalled state and a function to check for examples.
 */
export default function useExamples(types: ItemType[]) {
  const [examplesInstalled, setExamplesInstalled] = useState<boolean>(true);

  async function checkForExamples(types: ItemType[]) {
    let allInstalled = true;
    for (const type of types) {
      let key = StorageKey.EXAMPLE_PINS_INSTALLED;
      if (type === ItemType.PIN) {
        key = StorageKey.EXAMPLE_PINS_INSTALLED;
      } else if (type === ItemType.GROUP) {
        key = StorageKey.EXAMPLE_GROUPS_INSTALLED;
      }

      const installed = await getStorage(key);
      if (installed !== 1) {
        allInstalled = false;
        break;
      }
    }
    setExamplesInstalled(allInstalled);
    return allInstalled;
  }

  useEffect(() => {
    checkForExamples(types);
  }, []);

  return {
    examplesInstalled,
    setExamplesInstalled,
    checkForExamples,
  };
}
