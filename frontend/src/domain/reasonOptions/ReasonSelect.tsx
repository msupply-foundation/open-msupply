import { type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { reasonOptionsResource, type ReasonOption } from './reasonOptionsResource';

// Which reason types a use case offers. The reasonOptions list is global and spans many types;
// each site wants a slice of it, so the filtering lives HERE (one source of truth) rather than
// re-declared at every call site:
//  - 'adjustment' — a stocktake line's inventory adjustment (count differs from snapshot, either
//    direction): both positive and negative inventory-adjustment reasons.
//  - 'reduction'  — reduce-to-zero (always a reduction): negative inventory-adjustment only.
export type ReasonKind = 'adjustment' | 'reduction';

const KIND_TYPES: Record<ReasonKind, ReadonlySet<ReasonOption['type']>> = {
  adjustment: new Set(['POSITIVE_INVENTORY_ADJUSTMENT', 'NEGATIVE_INVENTORY_ADJUSTMENT']),
  reduction: new Set(['NEGATIVE_INVENTORY_ADJUSTMENT']),
};

/** The reason options for a kind — exported for non-select needs (e.g. resolving a label). */
export const reasonsOfKind = (kind: ReasonKind): ReasonOption[] =>
  reasonOptionsResource.noSuspense().filter((r) => KIND_TYPES[kind].has(r.type));

export interface ReasonSelectProps {
  /** Which reason types to offer (drives the filtering). */
  kind: ReasonKind;
  /** Selected reason-option id (undefined = none). */
  value?: string;
  /** Fires with the chosen reason option (full node, so the caller can store type/reason), or null. */
  onChange: (reason: ReasonOption | null) => void;
  /** Field label (required for a11y). */
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

/*
 * The reusable adjustment-reason picker — a Combobox pre-wired to the store-scoped reasonOptions
 * resource, filtered to the requested `kind`. A domain widget (src/domain). Unlike Location/
 * MasterList selects it reports the FULL reason node (not just the id), because callers store the
 * reason's type + label alongside the id (the stocktake line's reasonOption shape).
 */
export const ReasonSelect = (props: ReasonSelectProps): JSX.Element => (
  <Combobox<ReasonOption>
    label={props.label}
    hideLabel={props.hideLabel}
    items={reasonsOfKind(props.kind)}
    loading={reasonOptionsResource.loading()}
    itemToString={(r) => r.reason}
    itemToValue={(r) => r.id}
    value={props.value}
    disabled={props.disabled}
    error={props.error}
    placeholder={props.placeholder}
    onChange={(r) => props.onChange(r)}
  />
);
