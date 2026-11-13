import { type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import type { FocusTarget } from '../../ui/utils/createFocusTarget';
import { isDispensary } from '../../store/storeContext';
import {
  reasonOptionsResource,
  type ReasonOption,
} from './reasonOptionsResource';

// Which reason types a use case offers. The reasonOptions list is global and
// spans many types; each site wants a slice of it, so the filtering lives HERE
// (one source of truth) rather than re-declared at every call site. The kinds
// mirror the server's adjustment-DIRECTION rule (spec/stocktakes/rules.md
// §adjustment-reason rules; contract.md §adjustment-reason rules):
// - 'positive' — a positive adjustment (counted MORE than snapshot; stock went
//   up): positive-inventory-adjustment reasons only.
// - 'negative' — a negative adjustment (counted FEWER than snapshot, incl.
//   reduce-to-zero; stock went down). The server accepts a negative-
//   inventory-adjustment OR a vaccine-wastage (open-/closed-vial) reason for
//   ANY negative adjustment, so both are VALID here (reasonMatchesKind); what
//   the picker OFFERS is narrowed by the item (reasonsOfKind, issue #456): a
//   vaccine is offered closed-vial wastage, plus open-vial wastage in a
//   dispensary store, falling back to the plain negative reasons when no
//   wastage reason is configured; anything else is offered the plain negative
//   reasons only. A caller that only wants a reduction passes 'negative' too
//   (reduce-to-zero is always a reduction).
// - 'return' — a customer-return line's optional "why it came back"
//   (spec/customer-returns/rules.md § line rules): the active return reasons.
// - 'requisition' — a requisition line's variance reason, required when a
//   requested quantity departs from the suggestion on a customer-statistics
//   program order (spec/internal-orders/rules.md § editing lines,
// OMS-REG-REPL-04.79/.80):   the active requisition-line-variance reasons.
export type ReasonKind = 'positive' | 'negative' | 'return' | 'requisition';

const KIND_TYPES: Record<ReasonKind, ReadonlySet<ReasonOption['type']>> = {
  positive: new Set(['POSITIVE_INVENTORY_ADJUSTMENT']),
  negative: new Set([
    'NEGATIVE_INVENTORY_ADJUSTMENT',
    'OPEN_VIAL_WASTAGE',
    'CLOSED_VIAL_WASTAGE',
  ]),
  return: new Set(['RETURN_REASON']),
  requisition: new Set(['REQUISITION_LINE_VARIANCE']),
};

/** What the negative kind's narrowing reads about the line being adjusted. */
export interface ReasonContext {
  /** The adjusted item is a vaccine (offers vial-wastage reasons instead). */
  isVaccine?: boolean;
}

/**
 * The options a picker of this kind OFFERS, out of `reasons` — the pure core
 * of reasonsOfKind. Only the negative kind narrows, mirroring the React front
 * end's getReasonOptionTypes + ReasonOptionsSearchInput fallback (spec/
 * stocktakes/rules.md § UI narrowing of the reason picker).
 */
export const offeredReasons = (
  reasons: readonly ReasonOption[],
  kind: ReasonKind,
  context: ReasonContext & { isDispensary: boolean }
): ReasonOption[] => {
  if (kind === 'negative' && context.isVaccine) {
    const wastage = reasons.filter(
      r =>
        r.type === 'CLOSED_VIAL_WASTAGE' ||
        (context.isDispensary && r.type === 'OPEN_VIAL_WASTAGE')
    );
    if (wastage.length > 0) return wastage;
  }
  return reasons.filter(r =>
    kind === 'negative'
      ? r.type === 'NEGATIVE_INVENTORY_ADJUSTMENT'
      : KIND_TYPES[kind].has(r.type)
  );
};

/**
 * The reason options a picker of this kind offers for the given line —
 * exported for non-select needs (e.g. resolving a label).
 */
export const reasonsOfKind = (
  kind: ReasonKind,
  context: ReasonContext = {}
): ReasonOption[] =>
  offeredReasons(reasonOptionsResource.noSuspense(), kind, {
    ...context,
    isDispensary: isDispensary(),
  });

/**
 * Whether the server will DEMAND a reason for a stocktake adjustment in this
 * direction: true when an active plain adjustment reason of that direction
 * exists. Narrower than `reasonsOfKind('negative')` on purpose — the server's
 * "reason required" check consults only positive/negative-adjustment reasons,
 * never vaccine wastage (spec/stocktakes/contract.md § adjustment-reason
 * rules), so a store with wastage reasons alone never requires one. The
 * initial/blind-stocktake exemptions are the caller's to add.
 */
export const adjustmentReasonRequired = (
  direction: 'positive' | 'negative'
): boolean => {
  const type =
    direction === 'positive'
      ? 'POSITIVE_INVENTORY_ADJUSTMENT'
      : 'NEGATIVE_INVENTORY_ADJUSTMENT';
  return reasonOptionsResource.noSuspense().some(r => r.type === type);
};

/**
 * Whether a reason option is valid for a kind — the single source of truth for
 * the kind→types mapping, exported so callers can drop a now-mismatched reason
 * when the adjustment direction changes (e.g. a stocktake line recounted the
 * other way) without re-declaring the type sets.
 */
export const reasonMatchesKind = (
  reason: Pick<ReasonOption, 'type'>,
  kind: ReasonKind
): boolean => KIND_TYPES[kind].has(reason.type);

export interface ReasonSelectProps {
  /** Which reason types to offer (drives the filtering). */
  kind: ReasonKind;
  /**
   * The adjusted item is a vaccine — a negative picker then offers vial-
   * wastage reasons instead of the plain ones (reasonsOfKind).
   */
  isVaccine?: boolean;
  /** Selected reason-option id (undefined = none). */
  value?: string;
  /**
   * Fires with the chosen reason option (full node, so the caller can store
   * type/reason), or null.
   */
  onChange: (reason: ReasonOption | null) => void;
  /** Field label (required for a11y). */
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
  error?: string;
  /** Advisory warning line — forwarded to the Combobox (error displaces it). */
  warning?: string;
  /** Marks the field required — passed through to the Combobox's label. */
  required?: boolean;
  /** `data-testid` for the error message — forwarded to the Combobox. */
  errorTestId?: string;
  /** `data-testid` for the warning message — forwarded to the Combobox. */
  warningTestId?: string;
  /** `data-testid` for the text input — forwarded to the Combobox. */
  inputTestId?: string;
  placeholder?: string;
  /** Max-width cap — forwarded to the Combobox, opt-in (default `full`). */
  width?: 'compact' | 'short' | 'long' | 'full';
  /**
   * Control size, forwarded to the Combobox — `small` matches the compact
   * variant the dense card grids use. Without it the picker renders at the
   * default height beside `size="small"` neighbours, standing a step taller
   * than the fields either side of it (the same reason LocationVolumeSelect
   * carries one).
   */
  size?: 'default' | 'small';
  /**
   * A `createFocusTarget()` handle bound to the picker's input — for an owner
   * that focuses it after an action (e.g. a dialog opening on it).
   */
  focusTarget?: FocusTarget;
}

/*
 * The reusable adjustment-reason picker — a Combobox pre-wired to the
 * store-scoped reasonOptions resource, filtered to the requested `kind`. A
 * domain widget (src/domain). Unlike Location/ MasterList selects it reports
 * the FULL reason node (not just the id), because callers store the reason's
 * type + label alongside the id (the stocktake line's reasonOption shape).
 */
export const ReasonSelect = (props: ReasonSelectProps): JSX.Element => (
  <Combobox<ReasonOption>
    label={props.label}
    hideLabel={props.hideLabel}
    items={reasonsOfKind(props.kind, { isVaccine: props.isVaccine })}
    // A saved reason the narrowing no longer offers (e.g. a vaccine line saved
    // with a plain negative reason before #456) still shows its label, rather
    // than a blank field over a reason that's still stored.
    selectedItem={reasonOptionsResource
      .noSuspense()
      .find(r => r.id === props.value)}
    loading={reasonOptionsResource.loading()}
    itemToString={r => r.reason}
    itemToValue={r => r.id}
    value={props.value}
    disabled={props.disabled}
    error={props.error}
    warning={props.warning}
    required={props.required}
    errorTestId={props.errorTestId}
    warningTestId={props.warningTestId}
    inputTestId={props.inputTestId}
    placeholder={props.placeholder}
    width={props.width}
    size={props.size}
    focusTarget={props.focusTarget}
    onChange={r => props.onChange(r)}
  />
);
