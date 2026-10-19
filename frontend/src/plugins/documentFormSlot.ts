import type { Component } from 'solid-js';
import type { FormVersioning } from '../domain/documentForm/createDocumentForm';
import type { MigrationStep } from '../domain/documentForm/migration';
import type { DocumentFormSlotId, SlotPropsMap } from '../plugin-sdk/types';
import type { AnchorDiagnostic } from './anchorMerge';
import { contributionId, visibleContributions } from './PluginSlot';

/*
 * Form resolution for the document form slots (kdd/custom-forms/specs.md §
 * Forms in the UI): which form renders the body of a document, given its type.
 * The plugin form contributed for the type if one is, else the host's default
 * form for the category, which is also what renders in place of a plugin form
 * that throws (DocumentFormRegion.tsx). Within the plugin form, the document's
 * schema version picks between its archived form for that version, read-only,
 * and the current form after migration; the form host works that out from the
 * contribution's versioning (`documentFormVersioning`, createDocumentForm.ts).
 *
 * Pure over its candidate list, like the dashboard body's resolver
 * (sections/dashboard/bodyRegion.ts), so the rule is testable as data.
 *
 * TO-DO: the read-only fallback renderer after the default form, for a
 * document no form can show (implementation-plan H12).
 */

/** A plugin form as the host renders it. */
export interface DocumentFormOccupant<S extends DocumentFormSlotId> {
  /** The published id — plugin code + contribution id (the render key). */
  id: string;
  documentType: string;
  Component: Component<SlotPropsMap[S]>;
  /** Every schema id of the type, oldest first. */
  versions?: readonly string[];
  migrations?: readonly MigrationStep[];
  /** Earlier versions' forms, by version number, rendered read-only. */
  archived?: Readonly<Record<number, Component<SlotPropsMap[S]>>>;
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
    visibleContributions<DocumentFormSlotId>(slot).map(
      (contribution): DocumentFormOccupant<S> => ({
        id: contributionId(contribution),
        documentType: contribution.documentType,
        // Narrowed by slot: the registry's contribution for `S` carries the
        // Component for `S`'s props, which the union over both form slots
        // cannot show the compiler.
        Component: contribution.Component as Component<SlotPropsMap[S]>,
        versions: contribution.versions,
        migrations: contribution.migrations,
        archived: contribution.archived as
          Readonly<Record<number, Component<SlotPropsMap[S]>>> | undefined,
      })
    ),
    documentType
  );

/**
 * The versioning the plugin form for a document type declares, for the form
 * host; undefined when no plugin form renders the type or it declares no
 * versions. Reads the registry, so the caller calls it inside a memo.
 */
export const documentFormVersioning = (
  slot: DocumentFormSlotId,
  documentType: string
): FormVersioning | undefined => {
  const occupant = documentFormFor(slot, documentType).occupant;
  if (!occupant?.versions) return undefined;
  return {
    versions: occupant.versions,
    migrations: occupant.migrations ?? [],
    archived: Object.keys(occupant.archived ?? {}).map(Number),
  };
};
