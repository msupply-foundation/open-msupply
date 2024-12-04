/**
 * Simple hook to manage a data patch state, which is then passed into a
 * mutation to update a record.
 *
 * It holds the patch state, as well as provides methods to update and reset the
 * patch, and provides the "dirty" value (i.e. whether or not there is any
 * difference between the patch and the original "reference" data)
 */

import { isEqual } from '@openmsupply-client/common';
import { useState } from 'react';

export const usePatchState = <T>(referenceData: Record<string, unknown>) => {
  const [patch, setPatch] = useState<Partial<T>>({});
  const [isDirty, setIsDirty] = useState(false);

  const updatePatch = (newData: Partial<T>) => {
    const newPatch = { ...patch, ...newData };
    setPatch(newPatch);

    // Ensures that UI doesn't show in "dirty" state if nothing actually
    // different from the saved data
    const updatedData = { ...referenceData, ...newPatch };
    if (isEqual(referenceData, updatedData)) setIsDirty(false);
    else setIsDirty(true);
    return;
  };

  const resetDraft = () => {
    setPatch({});
    setIsDirty(false);
  };

  return { patch, updatePatch, resetDraft, isDirty };
};
