import { createStore } from 'solid-js/store';
import type { DraftItemVariant, DraftPackagingRow } from './itemVariantEdit';

/**
 * The variant editor's draft, held in a STORE and written field-by-field —
 * never by replacing a packaging row object (kdd/solid-reactivity-pitfalls
 * § 5, and § no remounts on interaction rule 2). The packaging grid renders
 * through <For>, which is keyed by reference: a replaced row reads as a NEW
 * row, so its three inputs are torn down and rebuilt and the focused one dies
 * on every keystroke (#593 — the custom-translations editor's #549 was the
 * same mechanism). A leaf write re-runs only that cell's binding, so the row
 * keeps its identity and its focus.
 *
 * Pinned by itemVariantDraft.test.tsx (mount counts across a field write).
 */
export const createItemVariantDraft = (initial: DraftItemVariant) => {
  const [form, setForm] = createStore<DraftItemVariant>(initial);

  /** Patch one packaging row in place, matched by its stable id. */
  const setPackaging = (
    id: string,
    patch: Partial<Pick<DraftPackagingRow, 'name' | 'packSize' | 'volumePerUnit'>>
  ) => setForm('packaging', row => row.id === id, patch);

  return { form, setForm, setPackaging };
};
