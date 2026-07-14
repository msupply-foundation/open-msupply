import { createEffect, on, Show, type Component } from 'solid-js';
import { createSignal } from 'solid-js';
import { t } from '../../intl';
import { TextField } from '../../ui/elements/inputs/TextField';
import { FieldRow } from '../../ui/elements/inputs/FieldRow';
import { Alert } from '../../ui/elements/feedback/Alert';
import {
  FilterBar,
  FilterTextInput,
} from '../../ui/elements/selectors/FilterBar';
import { createDebounced } from '../../ui/utils/createDebounced';
import { stocktakeDetailFilters } from './stocktakeDetailFilters';
import type { StocktakeLineFilter } from './stocktakeLineFilter';
import type { StocktakeInfoFragment } from './stocktakeDetail.generated';

// The detail view's toolbar (Open mSupply's Toolbar): the editable stocktake description, a
// disabled-state banner when the stocktake is on hold / finalised, the always-on item search, and
// the addable filter chips. Description edits are buffered locally and saved debounced through the
// view's onSaveDescription; the buffer decouples the input from the async save (OMS pattern) so
// typing stays snappy and the field doesn't jump when the mutation returns.

export interface StocktakeDetailToolbarProps {
  node: StocktakeInfoFragment;
  /** On hold / finalised → description is read-only and a banner explains why. */
  disabled: boolean;
  /** Debounced-saved description text (called per keystroke; the view debounces the mutation). */
  onSaveDescription: (description: string) => void;
  filter: StocktakeLineFilter;
  onFilterChange: (filter: StocktakeLineFilter) => void;
  /** True when the stocktake has error lines — enables the removable "Error lines" filter chip. */
  hasErrors: boolean;
}

export const StocktakeDetailToolbar: Component<StocktakeDetailToolbarProps> = (props) => {
  // Local buffer for the description. Seeded ONCE from the node, then self-owned while editing:
  // typing updates the buffer immediately and the debounced callback saves after a pause. We must
  // NOT re-seed from props.node.description on every info() change — our own save returns the node,
  // and re-seeding mid-edit would clobber what the user is typing (the debounce would "stop"
  // editing). We only re-seed when the stocktake IDENTITY changes (navigating to a different
  // stocktake without remount), keyed on node.id, never on the field value.
  const [description, setDescription] = createSignal(props.node.description ?? '');
  createEffect(
    on(
      () => props.node.id,
      () => setDescription(props.node.description ?? ''),
      { defer: true },
    ),
  );

  const saveDescription = createDebounced((value: string) => props.onSaveDescription(value), 500);
  const onInput = (value: string) => {
    setDescription(value);
    saveDescription(value);
  };

  const disabledMessage = () =>
    props.node.status === 'FINALISED'
      ? t('stocktake.detail.disabled-finalised')
      : t('stocktake.detail.disabled-on-hold');

  return (
    <>
      {/* The disabled banner spans the full toolbar width (its own wrapped line) — a status
          message about the whole stocktake, above the controls. */}
      <Show when={props.disabled}>
        <Alert severity="info">{disabledMessage()}</Alert>
      </Show>

      {/* One wrapping row (the Toolbar is a flex row): the labelled description, the always-on
          item search (name OR code, like OMS's SearchBar), then the addable filter chips — all
          sharing a baseline instead of stacking ragged. */}
      <FieldRow label={t('stocktake.detail.description')}>
        <TextField
          label={t('stocktake.detail.description')}
          hideLabel
          width="long"
          value={description()}
          disabled={props.disabled}
          onInput={(e) => onInput(e.currentTarget.value)}
          onBlur={() => saveDescription.flush()}
        />
      </FieldRow>

      <FilterTextInput
        label={t('stocktake.detail.search-items')}
        placeholder={t('stocktake.detail.search-items')}
        value={props.filter.search ?? ''}
        onInput={(value) => props.onFilterChange({ ...props.filter, search: value })}
      />

      <FilterBar
        filters={stocktakeDetailFilters(props.hasErrors)}
        filter={props.filter}
        onChange={props.onFilterChange}
      />
    </>
  );
};
