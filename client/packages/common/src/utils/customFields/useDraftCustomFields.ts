import { useEffect, useMemo, useState } from 'react';
import isEqual from 'lodash/isEqual';

/** A customFields value as edited: the scalars, plus the ARRAY of option ids a
 *  MULTI_OPTION field holds. `null` clears the key. */
export type DraftPropertyValue = string | number | boolean | string[] | null;
export type DraftProperties = Record<string, DraftPropertyValue>;

/**
 * Drop `null` entries so dirtiness compares by effective value: clearing a field
 * that wasn't in the loaded blob (key -> null) is a no-op, not an edit. A cleared
 * field that *was* loaded still differs (its value disappears), so deletes are
 * still detected.
 */
const withoutNulls = (props: DraftProperties): DraftProperties =>
  Object.fromEntries(Object.entries(props).filter(([, v]) => v !== null));

export interface UseDraftProperties {
  draftProperties: DraftProperties;
  /** Merge a partial update (key -> value) into the draft. */
  updateProperty: (update: DraftProperties) => void;
  /** True when the draft differs from the loaded blob. */
  isDirty: boolean;
}

/**
 * Draft state for a record's `properties_v2` blob, shared by every editable
 * properties tab (patient, invoice, …). The value arrives already parsed (a JSON
 * scalar object), so it's used directly. Resets whenever the loaded blob changes
 * (e.g. after a save invalidates and re-fetches the record).
 */
export const useDraftCustomFields = (
  initialProperties?: Record<string, unknown> | null
): UseDraftProperties => {
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
    isDirty: !isEqual(withoutNulls(draftProperties), withoutNulls(initial)),
  };
};
