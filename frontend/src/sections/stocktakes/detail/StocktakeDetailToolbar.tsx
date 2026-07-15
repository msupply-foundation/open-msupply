import { Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Alert } from '../../../ui/elements/feedback/Alert';
import {
  FilterBar,
  FilterTextInput,
} from '../../../ui/elements/selectors/FilterBar';
import { stocktakeDetailFilters } from './stocktakeDetailFilters';
import type { StocktakeLineFilter } from './stocktakeLineFilter';
import type { StocktakeInfoFragment } from './lines/stocktakeDetail.generated';
import type { StocktakeFieldEdit } from './stocktakeEdit';

// The detail view's toolbar (Open mSupply's Toolbar): the editable stocktake description, a
// disabled-state banner when the stocktake is on hold / finalised, the always-on item search, and
// the addable filter chips. The description reads/writes the shared stocktake edit buffer (owned by
// the view, one across the whole entity), so typing is buffered + debounced and coalesces with any
// side-panel edits into a single save (kdd/state-management).

export interface StocktakeDetailToolbarProps {
  node: StocktakeInfoFragment;
  /** On hold / finalised → description is read-only and a banner explains why. */
  disabled: boolean;
  /** The shared stocktake edit buffer — the description field reads/writes its `description` key. */
  edit: StocktakeFieldEdit;
  filter: StocktakeLineFilter;
  onFilterChange: (filter: StocktakeLineFilter) => void;
  /** True when the stocktake has error lines — enables the removable "Error lines" filter chip. */
  hasErrors: boolean;
}

export const StocktakeDetailToolbar: Component<StocktakeDetailToolbarProps> = (props) => {
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
          value={props.edit.state.description}
          disabled={props.disabled}
          onInput={(e) => props.edit.setField('description', e.currentTarget.value)}
          onBlur={() => props.edit.flush()}
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
