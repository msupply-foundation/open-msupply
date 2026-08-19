import { type Component } from 'solid-js';
import { t } from '@/intl';
import { localisedDate } from '@/intl/formatDateTime';
import {
  SidePanelSection,
  SidePanelActions,
} from '@/ui/layout/SidePanel/SidePanel';
import { TextField } from '@/ui/elements/inputs/TextField';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { UserLabel } from '@/ui/elements/typography/UserLabel';
import { Text } from '@/ui/elements/typography/Text';
import { DeleteStocktakeAction, CopyStocktakeAction } from './actions';
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
  storeId: string;
  node: StocktakeInfoFragment;
  disabled: boolean;
  /**
   * The shared stocktake edit buffer — this panel reads/writes countedBy /
   * verifiedBy / comment.
   */
  edit: StocktakeFieldEdit;
  /**
   * The record was deleted (from the "Actions" section's Delete) — the view
   * navigates back to the list. Copy is self-contained and needs no callback.
   */
  onDeleted: () => void;
}

export const StocktakeSidePanel: Component<StocktakeSidePanelProps> = props => (
  <>
    <SidePanelSection
      value="additional-info"
      title={t('heading.additional-info')}
      collapsible
    >
      {/* All rows share ONE FieldRow label column so labels line up and the
        read-only values sit on the same inline-start as the editable inputs
        below them. Row spacing is the section's own gap (SidePanel contract),
        not a wrapping Stack. Read-only rows render a plain value; editable
        ones a buffered field. */}
      <FieldRow label={t('label.entered-by')}>
        <UserLabel
          username={props.node.user?.username}
          email={props.node.user?.email}
          label={t('label.entered-by')}
          testId="entered-by-field"
        />
      </FieldRow>
      <FieldRow label={t('label.created')}>
        <Text variant="body">{localisedDate(props.node.createdDatetime)}</Text>
      </FieldRow>

      <FieldRow label={t('label.counted-by')}>
        <TextField
          label={t('label.counted-by')}
          hideLabel
          size="small"
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
          size="small"
          value={props.edit.state.verifiedBy}
          disabled={props.disabled}
          onInput={e =>
            props.edit.setField('verifiedBy', e.currentTarget.value)
          }
          onBlur={() => props.edit.flush()}
        />
      </FieldRow>
      <FieldRow label={t('heading.comment')}>
        <TextArea
          label={t('heading.comment')}
          hideLabel
          data-testid="comment-field"
          value={props.edit.state.comment}
          disabled={props.disabled}
          onInput={e => props.edit.setField('comment', e.currentTarget.value)}
          onBlur={() => props.edit.flush()}
        />
      </FieldRow>
    </SidePanelSection>

    {/* Record-level actions (spec/stocktakes/ui-surface.md §S3): Delete — gated
        on NEW+unlocked (the same `disabled` gate the fields use; the backend is
        the final authority) — and Copy to clipboard, always available. */}
    <SidePanelSection value="actions" title={t('heading.actions')}>
      <SidePanelActions>
        <DeleteStocktakeAction
          storeId={props.storeId}
          stocktakeId={props.node.id}
          stocktakeNumber={props.node.stocktakeNumber}
          disabled={props.disabled}
          onDeleted={props.onDeleted}
        />
        <CopyStocktakeAction
          storeId={props.storeId}
          stocktakeId={props.node.id}
        />
      </SidePanelActions>
    </SidePanelSection>
  </>
);
