import { Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { TextField } from '@/ui/elements/inputs/TextField';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { Alert } from '@/ui/elements/feedback/Alert';
import {
  FilterBar,
  FilterTextInput,
} from '@/ui/elements/selectors/FilterBar';
import { stocktakeDetailFilters } from './stocktakeDetailFilters';
import type { StocktakeLineFilter } from './stocktakeLineFilter';
import type { StocktakeInfoFragment } from './lines/stocktakeDetail.generated';
import type { StocktakeFieldEdit } from './stocktakeEdit';
import type { LocationWithVolume } from '@/domain/location';

// The detail view's toolbar (Open mSupply's Toolbar): the editable stocktake
// description, a disabled-state banner when the stocktake is on hold /
// finalised, the always-on item search, and the addable filter chips. The
// description reads/writes the shared stocktake edit buffer (owned by the view,
// one across the whole entity), so typing is buffered + debounced and coalesces
// with any side-panel edits into a single save (kdd/state-management).

export interface StocktakeDetailToolbarProps {
  node: StocktakeInfoFragment;
  /**
   * On hold / finalised → description is read-only and a banner explains why.
   */
  disabled: boolean;
  /**
   * The shared stocktake edit buffer — the description field reads/writes its
   * `description` key.
   */
  edit: StocktakeFieldEdit;
  filter: StocktakeLineFilter;
  onFilterChange: (filter: StocktakeLineFilter) => void;
  /**
   * The store's locations (fetched by the view, shared with the editor pickers).
   * The location filter chip uses the volume-blind picker, so it reads only the
   * code/name — but we take the volume shape the view already has to avoid a
   * second fetch.
   */
  locations: LocationWithVolume[];
}

export const StocktakeDetailToolbar: Component<
  StocktakeDetailToolbarProps
> = props => {
  // Build the filter definitions ONCE (a Solid component body runs once at
  // mount). The location chip's render reads `props.locations` through this
  // accessor, so the live list flows in without rebuilding the filter array on
  // every location refetch.
  const filters = stocktakeDetailFilters(() => props.locations);

  const disabledMessage = () =>
    props.node.status === 'FINALISED'
      ? t('messages.finalised-stock-take')
      : t('messages.on-hold-stock-take');

  return (
    <>
      {/* The disabled banner spans the full toolbar width (its own wrapped line) — a status
          message about the whole stocktake, above the controls. */}
      <Show when={props.disabled}>
        <Alert severity="info" testId="stocktake-status-alert">
          {disabledMessage()}
        </Alert>
      </Show>

      {/* One wrapping row (the Toolbar is a flex row): the labelled description, the always-on
          item search (name OR code, like OMS's SearchBar), then the addable filter chips — all
          sharing a baseline instead of stacking ragged. */}
      <FieldRow label={t('heading.description')}>
        <TextField
          label={t('heading.description')}
          hideLabel
          width="long"
          data-testid="description-field"
          value={props.edit.state.description}
          disabled={props.disabled}
          onInput={e =>
            props.edit.setField('description', e.currentTarget.value)
          }
          onBlur={() => props.edit.flush()}
        />
      </FieldRow>

      {/* Always-on item search — name OR code (server itemCodeOrName.like), like
          OMS's SearchBar. Blank clears to null so stripEmpty drops it (a blank
          `like` would match everything). */}
      <FilterTextInput
        label={t('placeholder.filter-items')}
        placeholder={t('placeholder.filter-items')}
        value={props.filter.itemCodeOrName?.like ?? ''}
        onInput={value =>
          props.onFilterChange({
            ...props.filter,
            itemCodeOrName: value ? { like: value } : null,
          })
        }
      />

      <FilterBar
        filters={filters}
        filter={props.filter}
        onChange={props.onFilterChange}
      />
    </>
  );
};
