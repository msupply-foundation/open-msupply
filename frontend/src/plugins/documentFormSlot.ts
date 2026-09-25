import type { Component } from 'solid-js';
import type { DocumentFormSlotId, SlotPropsMap } from '../plugin-sdk/types';
import type { AnchorDiagnostic } from './anchorMerge';
import { contributionId, visibleContributions } from './PluginSlot';

/*
 * Form resolution for the document form slots (kdd/custom-forms/specs.md §
 * Forms in the UI; implementation-plan H5): which form renders the body of a
 * document, given its type. The plugin form contributed for the type if one
 * is, else the host's default form for the category, which is also what
 * renders in place of a plugin form that throws (DocumentFormRegion.tsx).
 *
 * Pure over its candidate list, like the dashboard body's resolver
 * (sections/dashboard/bodyRegion.ts), so the rule is testable as data.
 *
 * TO-DO: an archived form for the document's pinned schema version, read-only,
 * ahead of the current one (implementation-plan H4's versioning half, chunk
 * 5); the read-only fallback renderer after the default (H12).
 *
 * TO-DO: name a plugin form's fields in the error summary in the user's
 * language, from keys in the plugin's catalogue that its contribution
 * declares, joined into the `labels` the screen passes the form host.
 * `pathLabel` names them from their paths (worklog decision 2026-09-25).
 */

/** A plugin form as the host renders it. */
export interface DocumentFormOccupant<S extends DocumentFormSlotId> {
  /** The published id — plugin code + contribution id (the render key). */
  id: string;
  documentType: string;
  Component: Component<SlotPropsMap[S]>;
}

export interface DocumentFormResolution<S extends DocumentFormSlotId> {
  /** The plugin form, or undefined for the host's default form. */
  occupant: DocumentFormOccupant<S> | undefined;
  diagnostics: AnchorDiagnostic[];
}

/**
 * Choose the form for one document type from the contributions visible in
 * this store. `candidates` arrive in the registry's deterministic order, so the
 * first for the type renders, identically on every reload; any other claiming
 * the same type is named in diagnostics, since two plugins rendering one type
 * is a deployment mistake that should degrade loudly.
 */
export const selectDocumentForm = <S extends DocumentFormSlotId>(
  candidates: readonly DocumentFormOccupant<S>[],
  documentType: string
): DocumentFormResolution<S> => {
  const [occupant, ...passedOver] = candidates.filter(
    candidate => candidate.documentType === documentType
  );
  if (!occupant) return { occupant: undefined, diagnostics: [] };
  return {
    occupant,
    diagnostics: passedOver.map(candidate => ({
      contributionId: candidate.id,
      message: `passed over: document type "${documentType}" renders one form, and "${occupant.id}" claimed it first`,
    })),
  };
};

/**
 * The form for a document type as the host reads it. Reads the registry and
 * the slot context, so the caller MUST call it inside its own single
 * `createMemo` (src/plugins/PluginSlot.tsx).
 */
export const documentFormFor = <S extends DocumentFormSlotId>(
  slot: S,
  documentType: string
): DocumentFormResolution<S> =>
  selectDocumentForm(
    // Read over both form slots' union, which the compiler can narrow, rather
    // than over `S`, which it cannot.
    visibleContributions<DocumentFormSlotId>(slot).map((contribution): DocumentFormOccupant<S> => ({
      id: contributionId(contribution),
      documentType: contribution.documentType,
      // Narrowed by slot: the registry's contribution for `S` carries the
      // Component for `S`'s props, which the union over both form slots
      // cannot show the compiler.
      Component: contribution.Component as Component<SlotPropsMap[S]>,
    })),
    documentType
  );
