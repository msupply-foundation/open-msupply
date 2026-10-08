import type { UpsertBundledItemVariables } from './itemVariantMutations.generated';
import type { ItemVariantRow } from './itemVariantEdit';

// Pure logic for the bundled-item modal (spec/items S4, rules.md § bundled
// variants). Colocated + pure so the candidate-disable and ratio rules are
// unit-tested without the screen — mirrors itemVariantEdit.ts.

export type DraftBundledItem = {
  /** The chosen item; '' = none picked yet (step 1, ui-surface S4). */
  itemId: string;
  /**
   * The chosen variant of that item; '' = none picked (step 2, shown once
   * itemId is set).
   */
  variantId: string;
  /** Pre-filled 1 (ui-surface S4); undefined = blank. */
  ratio: number | undefined;
};

export const EMPTY_FORM: DraftBundledItem = {
  itemId: '',
  variantId: '',
  ratio: 1,
};

/**
 * ui-surface S4 — Save disabled until a variant is chosen and the ratio is
 * non-zero (the only ratio guard; rules.md: the server stores any ratio
 * unvalidated, so this is a UI-only guard).
 */
export const isFormValid = (form: DraftBundledItem): boolean =>
  !!form.variantId && (form.ratio ?? 0) > 0;

export const buildUpsertInput = (
  form: DraftBundledItem,
  principalItemVariantId: string,
  id: string
): UpsertBundledItemVariables['input'] => ({
  id,
  principalItemVariantId,
  bundledItemVariantId: form.variantId,
  ratio: form.ratio ?? 0,
});

/**
 * The client-side mirror of the no-nesting/no-duplicate rules
 * (rules.md § bundled variants) — a candidate variant (of the chosen item,
 * already excluding the principal's own item at the item-picker step) is
 * offered DISABLED, not excluded, when:
 *  - it already bundles other variants into it (`bundledItemVariants`) — it's
 *    already a principal, so it can't also become a bundled child (no nesting);
 *  - it's already bundled onto another variant (`bundlesWith`) — it's already
 *    a bundled child, so it can't also become a principal (the other nesting
 *    direction);
 *  - it's already one of this principal's existing bundled variants (would be
 *    a duplicate pair).
 */
export const isVariantDisabled = (
  candidate: ItemVariantRow,
  existingBundledVariantIds: readonly string[]
): boolean =>
  candidate.bundledItemVariants.length > 0 ||
  candidate.bundlesWith.length > 0 ||
  existingBundledVariantIds.includes(candidate.id);

// Trim to 4 decimals without rounding away a meaningful fraction (ported from
// ancillaryItemEdit.ts's formatRatio — same "preserve the entered value"
// intent, one number instead of an x:y pair).
const trim = (n: number) => Number(n.toFixed(4)).toString();

/** The stored ratio, as entered from the principal's side. */
export const formatRatio = (ratio: number): string => trim(ratio);

/**
 * The "Bundled on" side's inverse ratio (rules.md § bundled variants: ratio is
 * stored from the principal's perspective, so the bundled side shows 1/ratio).
 * A stored ratio of 0 (server-unvalidated — rules.md) has no inverse; render
 * it as 0 rather than Infinity.
 */
export const invertRatio = (ratio: number): string =>
  ratio === 0 ? trim(0) : trim(1 / ratio);
