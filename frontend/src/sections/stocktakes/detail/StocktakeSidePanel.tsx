import { type Component } from 'solid-js';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { SidePanelSection } from '../../../ui/layout/SidePanel/SidePanel';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Text } from '../../../ui/elements/typography/Text';
import type { StocktakeInfoFragment } from './lines/stocktakeDetail.generated';
import type { StocktakeFieldEdit } from './stocktakeEdit';

// The Additional-info side panel (Open mSupply's SidePanel →
// AdditionalInfoSection): read-only "Entered by" / "Created", then the editable
// Counted by / Verified by / Comment. The three editable fields read/write the
// shared stocktake edit buffer (owned by the view, one across the whole entity)
// — each keystroke writes the store and saves debounced, coalescing with each
// other AND with the toolbar's description into a single updateStocktake
// (kdd/state-management). The buffer decouples the inputs from the async
// mutation (typing is smooth, the fields never jump when a save returns) and
// re-seeds only when the stocktake identity changes.

export interface StocktakeSidePanelProps {
  node: StocktakeInfoFragment;
  disabled: boolean;
  /**
   * The shared stocktake edit buffer — this panel reads/writes countedBy /
   * verifiedBy / comment.
   */
  edit: StocktakeFieldEdit;
}

export const StocktakeSidePanel: Component<StocktakeSidePanelProps> = props => (
  <SidePanelSection title={t('stocktake.detail.additional-info')}>
    {/* All rows share ONE FieldRow label column so labels line up and the read-only values sit on
        the same inline-start as the editable inputs below them (no mixed <dl>/FieldRow widths).
        Read-only rows render a plain value; editable ones a buffered field. */}
    <FieldRow label={t('label.entered-by')}>
      <Text variant="body">{props.node.user?.username ?? '—'}</Text>
    </FieldRow>
    <FieldRow label={t('stocktake.column.created')}>
      <Text variant="body">{localisedDate(props.node.createdDatetime)}</Text>
    </FieldRow>

    <FieldRow label={t('label.counted-by')}>
      <TextField
        label={t('label.counted-by')}
        hideLabel
        width="full"
        value={props.edit.state.countedBy}
        disabled={props.disabled}
        onInput={e => props.edit.setField('countedBy', e.currentTarget.value)}
        onBlur={() => props.edit.flush()}
      />
    </FieldRow>
    <FieldRow label={t('label.verified-by')}>
      <TextField
        label={t('label.verified-by')}
        hideLabel
        width="full"
        value={props.edit.state.verifiedBy}
        disabled={props.disabled}
        onInput={e => props.edit.setField('verifiedBy', e.currentTarget.value)}
        onBlur={() => props.edit.flush()}
      />
    </FieldRow>
    <FieldRow label={t('stocktake.detail.comment')}>
      <TextField
        label={t('stocktake.detail.comment')}
        hideLabel
        width="full"
        value={props.edit.state.comment}
        disabled={props.disabled}
        onInput={e => props.edit.setField('comment', e.currentTarget.value)}
        onBlur={() => props.edit.flush()}
      />
    </FieldRow>
  </SidePanelSection>
);
