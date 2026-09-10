import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { generateUUID } from '@/uuid';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { CancelButton, OkButton } from '@/ui/elements/buttons/StandardButtons';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { DateField } from '@/ui/elements/inputs/DateField';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import { InsertAssetLog } from '../equipment.generated';
import { buildMappingLogInput, isMappingDateValid } from './statusLog';

// S6 — the Temperature mapping modal (ui-surface S6). A dated note that the
// room's temperature distribution was surveyed — no status and no reason: a
// mapping is an observation, not a judgement of condition.
//
// Reachable only from a cold room or freezer room (OMS-REG-CCE-06.32). Recording one
// recalculates the asset's two mapping-date properties, server-side, from the
// whole history (OMS-REG-CCE-06.33/.34).

/** Today, as the ISO day the picker and the cap both speak. */
const todayIso = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export interface TemperatureMappingModalProps {
  storeId: string;
  assetId: string;
  onClose: () => void;
  onRecorded: () => void;
}

export const TemperatureMappingModal: Component<
  TemperatureMappingModalProps
> = props => {
  // Defaults to today — the common case is recording a survey just done.
  const [date, setDate] = createSignal(todayIso());
  const [comment, setComment] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  // The observations field takes the opening focus: the date already carries
  // today, so the note is the first thing left to enter.
  const commentField = createFocusTarget();

  // A mapping MAY be backdated but never postdated: the picker caps at today
  // and the guard mirrors the cap (OMS-REG-CCE-06.25/.26).
  const valid = () => isMappingDateValid(date(), new Date());

  const save = async () => {
    if (saving() || !valid()) return;
    setSaving(true);
    const result = await graphqlFetch(InsertAssetLog, {
      storeId: props.storeId,
      input: buildMappingLogInput(
        date(),
        comment(),
        props.assetId,
        generateUUID()
      ),
    });
    setSaving(false);
    if (result.kind !== 'success') return;
    props.onRecorded();
    props.onClose();
  };

  return (
    <Dialog
      open
      initialFocus={commentField}
      testId="temperature-mapping-modal"
      title={t('label.temperature-mapping')}
      dismissable={!saving()}
      onClose={props.onClose}
      actions={
        <>
          <Show when={!saving()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          <OkButton
            data-testid="dialog-button-ok"
            loading={saving()}
            disabled={!valid() || saving()}
            onClick={() => void save()}
          />
        </>
      }
    >
      <FieldRow label={t('label.date')} required>
        <DateField
          label={t('label.date')}
          hideLabel
          // Nothing later than today is selectable — the server refuses a
          // datetime in the future.
          max={todayIso()}
          disabled={saving()}
          value={date() || null}
          onChange={value => setDate(value ?? '')}
        />
      </FieldRow>
      <FieldRow label={t('label.observations')} align="first-line">
        <TextArea
          ref={commentField.ref}
          label={t('label.observations')}
          hideLabel
          rows={3}
          data-testid="mapping-observations-input"
          disabled={saving()}
          value={comment()}
          onInput={e => setComment(e.currentTarget.value)}
        />
      </FieldRow>
    </Dialog>
  );
};
