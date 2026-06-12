import { useEffect, useMemo, useState } from 'react';
import { isEqual } from '@common/utils';

export type DraftProperties = Record<string, string | number | boolean | null>;

interface DraftInvoiceProperties {
  draftProperties: DraftProperties;
  /** Merge a partial update (key -> value) into the draft. */
  updateProperty: (update: DraftProperties) => void;
  /** True when the draft differs from the loaded blob. */
  isDirty: boolean;
}

/**
 * Draft state for an invoice's `properties_v2` blob (same pattern as the
 * patient `useDraftPatientProperties`). The value arrives already parsed (JSON
 * scalar object), so it's used directly. Resets whenever the loaded blob
 * changes (e.g. after a save invalidates and re-fetches the invoice).
 */
export const useDraftInvoiceProperties = (
  initialProperties?: Record<string, unknown> | null
): DraftInvoiceProperties => {
  const initial = useMemo(
    () => (initialProperties ?? {}) as DraftProperties,
    [initialProperties]
  );

  const [draftProperties, setDraftProperties] =
    useState<DraftProperties>(initial);

  useEffect(() => {
    setDraftProperties(initial);
  }, [initial]);

  const updateProperty = (update: DraftProperties) =>
    setDraftProperties(prev => ({ ...prev, ...update }));

  return {
    draftProperties,
    updateProperty,
    isDirty: !isEqual(draftProperties, initial),
  };
};
