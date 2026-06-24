import { useEffect, useMemo, useState } from 'react';
import { isEqual } from '@common/utils';

export type DraftProperties = Record<string, string | number | boolean | null>;

/**
 * Drop `null` entries so dirtiness compares by effective value: clearing a field
 * that wasn't in the loaded blob (key -> null) is a no-op, not an edit. A cleared
 * field that *was* loaded still differs (its value disappears), so deletes are
 * still detected.
 */
const withoutNulls = (props: DraftProperties): DraftProperties =>
  Object.fromEntries(Object.entries(props).filter(([, v]) => v !== null));

interface DraftPatientProperties {
  draftProperties: DraftProperties;
  /** Merge a partial update (key -> value) into the draft. */
  updateProperty: (update: DraftProperties) => void;
  /** True when the draft differs from the loaded blob. */
  isDirty: boolean;
}

/**
 * Draft state for a patient's `properties_v2` blob. Unlike the legacy store
 * draft hook, the value arrives already parsed (JSON scalar object), so it's
 * used directly. Resets whenever the loaded blob changes (e.g. after a save
 * invalidates and re-fetches the patient).
 */
export const useDraftPatientProperties = (
  initialProperties?: Record<string, unknown> | null
): DraftPatientProperties => {
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
