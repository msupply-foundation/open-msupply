import { createEffect, createSignal, on, type Component } from 'solid-js';
import { t } from '../../intl';
import { localisedDate } from '../../intl/formatDateTime';
import { SidePanelSection } from '../../ui/layout/SidePanel/SidePanel';
import { TextField } from '../../ui/elements/inputs/TextField';
import { FieldRow } from '../../ui/elements/inputs/FieldRow';
import { Text } from '../../ui/elements/typography/Text';
import { createDebounced } from '../../ui/utils/createDebounced';
import type { StocktakeInfoFragment } from './stocktakeDetail.generated';

// The Additional-info side panel (Open mSupply's SidePanel → AdditionalInfoSection): read-only
// "Entered by" / "Created", then the editable Counted by / Verified by / Comment. Each editable
// field buffers locally and saves debounced through the view's onSave (the buffer decouples the
// input from the async mutation, so typing is smooth and the field never jumps when the save
// returns). All three write their own UpdateStocktakeInput key.

export interface StocktakeSidePanelProps {
  node: StocktakeInfoFragment;
  disabled: boolean;
  onSave: (patch: { countedBy?: string; verifiedBy?: string; comment?: string }) => void;
}

// A single buffered + debounced text field bound to one stocktake string field. Kept inline (not
// a shared primitive) — it's three near-identical uses in one file; an explicit local component
// reads more clearly than a config list (kdd/explicit-composition).
const BufferedField: Component<{
  label: string;
  value: string | null | undefined;
  /** The stocktake id — re-seeds the buffer only when the IDENTITY changes, never on value. */
  seedKey: string;
  disabled: boolean;
  onSave: (value: string) => void;
}> = (props) => {
  // Seed ONCE, then self-own while editing. We must NOT re-seed from props.value on every change
  // — our own debounced save returns the node, and re-seeding mid-edit would clobber the user's
  // typing (the debounce would appear to "stop" editing). Only a different stocktake (seedKey)
  // re-seeds; the field value never does.
  const [buffer, setBuffer] = createSignal(props.value ?? '');
  createEffect(on(() => props.seedKey, () => setBuffer(props.value ?? ''), { defer: true }));
  const save = createDebounced((value: string) => props.onSave(value), 500);
  return (
    <FieldRow label={props.label}>
      <TextField
        label={props.label}
        hideLabel
        width="full"
        value={buffer()}
        disabled={props.disabled}
        onInput={(e) => {
          setBuffer(e.currentTarget.value);
          save(e.currentTarget.value);
        }}
        onBlur={() => save.flush()}
      />
    </FieldRow>
  );
};

// Just the panel CONTENT — the panel frame (docked overlay, header, title, close button) is baked
// into the Page (Page.sidePanelContent + sidePanelTitle). This is a stack of SidePanelSections.
export const StocktakeSidePanel: Component<StocktakeSidePanelProps> = (props) => (
  <SidePanelSection title={t('stocktake.detail.additional-info')}>
    {/* All rows share ONE FieldRow label column so labels line up and the read-only values sit on
        the same inline-start as the editable inputs below them (no mixed <dl>/FieldRow widths).
        Read-only rows render a plain value; editable ones a buffered field. */}
    <FieldRow label={t('stocktake.detail.entered-by')}>
        <Text variant="body">{props.node.user?.username ?? '—'}</Text>
      </FieldRow>
      <FieldRow label={t('stocktake.column.created')}>
        <Text variant="body">{localisedDate(props.node.createdDatetime)}</Text>
      </FieldRow>

      <BufferedField
        label={t('stocktake.detail.counted-by')}
        value={props.node.countedBy}
        seedKey={props.node.id}
        disabled={props.disabled}
        onSave={(value) => props.onSave({ countedBy: value })}
      />
      <BufferedField
        label={t('stocktake.detail.verified-by')}
        value={props.node.verifiedBy}
        seedKey={props.node.id}
        disabled={props.disabled}
        onSave={(value) => props.onSave({ verifiedBy: value })}
      />
      <BufferedField
        label={t('stocktake.detail.comment')}
        value={props.node.comment}
        seedKey={props.node.id}
        disabled={props.disabled}
        onSave={(value) => props.onSave({ comment: value })}
      />
  </SidePanelSection>
);
