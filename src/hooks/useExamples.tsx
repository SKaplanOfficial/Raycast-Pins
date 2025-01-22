import { useEffect, useState } from "react";
import { ItemType, storageKeys } from "../lib/common";
import { getStorage } from "../lib/storage";

/**
 * Hook to check if examples are installed, and to install them if they are not.
 * @param types The types of examples to check for (e.g. pins, groups).
 */
export default function useExamples(types: ItemType[]) {
  const [examplesInstalled, setExamplesInstalled] = useState<boolean>(true);

  async function checkForExamples(types: ItemType[]) {
    let allInstalled = true;
    for (const type of types) {
      const key = type == ItemType.PIN ? storageKeys.examplePinsInstalled : storageKeys.exampleGroupsInstalled;
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
