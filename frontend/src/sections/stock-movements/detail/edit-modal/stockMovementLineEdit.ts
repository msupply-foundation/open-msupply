import { t } from '../../../../intl';
import { formatNumber } from '../../../../intl/formatNumber';
import type { DraftStockMovementLineFragment } from './stockMovementDraftLines.generated';

// Pure derivations for the line editor (spec/stock-movements/rules.md § lines,
// § line candidates; ui-surface.md § S3). Kept free of components so the
// behaviour-citing tests exercise them directly (cases/OMS-REG-SMV-10
// .8–.14).

// The already-added exclusion is a client convenience, not a server rule
// (rules § lines): candidates whose batch is already on the movement are
// withheld — except the batch of the line being edited, which must stay
// offerable to its own edit. OMS-REG-SMV-10.8.
export const excludeAddedBatches = (
  candidates: DraftStockMovementLineFragment[],
  addedStockLineIds: readonly string[],
  editedStockLineId?: string
): DraftStockMovementLineFragment[] =>
  candidates.filter(
    c =>
      c.stockLineId === editedStockLineId ||
      !addedStockLineIds.includes(c.stockLineId)
  );

// Only a held LOCATION disables a candidate (rules § lines: an on-hold batch
// is not blocked). The composite onHold flag exists on the wire but the
// disable follows the location alone, matching what the save would accept.
// OMS-REG-SMV-10.9.
export const isCandidateDisabled = (
  c: DraftStockMovementLineFragment
): boolean => c.sourceLocation?.onHold ?? false;

// The pieces of the option label, pure so the derivation is testable away
// from the dictionary: dash for a missing batch name or location, and the
// packs figure is the batch's TOTAL packs (ui-surface § S3).
export const candidateLabelParams = (c: DraftStockMovementLineFragment) => ({
  batch: c.batch ?? '-',
  packSize: formatNumber(c.packSize),
  packs: formatNumber(c.totalNumberOfPacks),
  location: c.sourceLocation?.code ?? '-',
});

// "‹batch› · pack size ‹n› · ‹n› packs · location ‹code›", suffixed
// "(On hold)" on a location-held candidate (ui-surface § S3).
export const candidateLabel = (c: DraftStockMovementLineFragment): string => {
  const label = t('label.stock-line-option', candidateLabelParams(c));
  return isCandidateDisabled(c) ? `${label} (${t('label.on-hold')})` : label;
};

// Destination must differ from the batch's current location (rules § lines).
// OMS-REG-SMV-10.10/.14 — the picker disables the source in place; this is
// the save-gate mirror of the same rule.
export const destinationDiffersFromSource = (
  destinationId: string | undefined,
  c: DraftStockMovementLineFragment | undefined
): boolean =>
  destinationId !== undefined && destinationId !== c?.sourceLocation?.id;

// Quantity floor 1, ceiling the batch's AVAILABLE packs; fractions above one
// pack are accepted (rules § lines). OMS-REG-SMV-10.11/.12/.13.
export const packsInBounds = (
  packs: number | undefined,
  available: number
): boolean => packs !== undefined && packs >= 1 && packs <= available;

// The save-enable gate (ui-surface § S3: batch + destination ≠ source +
// quantity within bounds — a destination is required in the UI even though
// the wire accepts none).
export const canSaveLine = (draft: {
  candidate: DraftStockMovementLineFragment | undefined;
  destinationId: string | undefined;
  packs: number | undefined;
}): boolean =>
  draft.candidate !== undefined &&
  destinationDiffersFromSource(draft.destinationId, draft.candidate) &&
  packsInBounds(draft.packs, draft.candidate.availableNumberOfPacks);
