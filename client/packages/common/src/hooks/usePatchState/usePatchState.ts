/**
 * Simple hook to manage a data patch state, which is then passed into a
 * mutation to update a record.
 *
 * It holds the patch state, as well as provides methods to update and reset the
 * patch, and provides the "dirty" value (i.e. whether or not there is any
 * difference between the patch and the original "reference" data)
 */

import { isEqual } from '@openmsupply-client/common';
import { useCallback, useMemo, useRef, useState } from 'react';

export const usePatchState = <T>(referenceData: Record<string, unknown>) => {
  const [patch, setPatch] = useState<Partial<T>>({});
  const patchRef = useRef<Partial<T>>({});

  const updatePatch = useCallback((newData: Partial<T>) => {
    patchRef.current = { ...patchRef.current, ...newData };
    setPatch(prev => ({ ...prev, ...newData }));
  }, []);

  const resetDraft = useCallback(() => {
    patchRef.current = {};
    setPatch({});
  }, []);

  const isDirty = useMemo(
    () => !isEqual(referenceData, { ...referenceData, ...patch }),
    [referenceData, patch]
  );

  return { patch, patchRef, updatePatch, resetDraft, isDirty };
};
