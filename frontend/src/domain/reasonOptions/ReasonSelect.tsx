import { type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
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
//   reduce-to-zero; stock went down): negative-inventory-adjustment reasons
//   PLUS vaccine-wastage (open-/closed-vial). The server accepts wastage for
//   ANY negative adjustment; offering them here is the documented client
//   narrowing (rules §reason valid). A caller that only wants a reduction
//   passes 'negative' too (reduce-to-zero is always a reduction).
// - 'return' — a customer-return line's optional "why it came back"
//   (spec/customer-returns/rules.md § line rules): the active return reasons.
export type ReasonKind = 'positive' | 'negative' | 'return';

const KIND_TYPES: Record<ReasonKind, ReadonlySet<ReasonOption['type']>> = {
  positive: new Set(['POSITIVE_INVENTORY_ADJUSTMENT']),
  negative: new Set([
    'NEGATIVE_INVENTORY_ADJUSTMENT',
    'OPEN_VIAL_WASTAGE',
    'CLOSED_VIAL_WASTAGE',
  ]),
  return: new Set(['RETURN_REASON']),
};

/**
 * The reason options for a kind — exported for non-select needs (e.g.
 * resolving a label).
 */
export const reasonsOfKind = (kind: ReasonKind): ReasonOption[] =>
  reasonOptionsResource.noSuspense().filter(r => KIND_TYPES[kind].has(r.type));

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
  /** `data-testid` for the error message — forwarded to the Combobox. */
  errorTestId?: string;
  placeholder?: string;
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
    items={reasonsOfKind(props.kind)}
    loading={reasonOptionsResource.loading()}
    itemToString={r => r.reason}
    itemToValue={r => r.id}
    value={props.value}
    disabled={props.disabled}
    error={props.error}
    errorTestId={props.errorTestId}
    placeholder={props.placeholder}
    onChange={r => props.onChange(r)}
  />
);
