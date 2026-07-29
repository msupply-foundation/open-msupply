import { Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { TextField } from '@/ui/elements/inputs/TextField';
import { HeaderToolbar } from '@/ui/layout/Header/HeaderToolbar';
import { Alert } from '@/ui/elements/feedback/Alert';
import type { StocktakeInfoFragment } from './lines/stocktakeDetail.generated';
import type { StocktakeFieldEdit } from './stocktakeEdit';

// The detail view's header field cluster (ui-standards → HeaderToolbar): the
// editable stocktake description as a label-above header meta field, with a
// compact status chip (on hold / finalised) riding the row. The line table's
// filters live in the DataTable's own toolbar (StocktakeLineFilters), not here
// (ui-standards → tables › filtering). The description reads/writes the shared
// stocktake edit buffer (owned by the view, one across the whole entity), so
// typing is buffered + debounced and coalesces with any side-panel edits into
// a single save (kdd/state-management).

export interface StocktakeDetailToolbarProps {
  node: StocktakeInfoFragment;
  /**
   * On hold / finalised → description is read-only and a status chip explains
   * why.
   */
  disabled: boolean;
  /**
   * The shared stocktake edit buffer — the description field reads/writes its
   * `description` key.
   */
  edit: StocktakeFieldEdit;
}

export const StocktakeDetailToolbar: Component<
  StocktakeDetailToolbarProps
> = props => {
  const disabledMessage = () =>
    props.node.status === 'FINALISED'
      ? t('messages.finalised-stock-take')
      : t('messages.on-hold-stock-take');

  return (
    <HeaderToolbar
      alert={
        <Show when={props.disabled}>
          <Alert compact severity="info" testId="stocktake-status-alert">
            {disabledMessage()}
          </Alert>
        </Show>
      }
    >
      <TextField
        label={t('heading.description')}
        width="full"
        data-testid="description-field"
        value={props.edit.state.description}
        disabled={props.disabled}
        onInput={e => props.edit.setField('description', e.currentTarget.value)}
        onBlur={() => props.edit.flush()}
      />
    </HeaderToolbar>
  );
};
