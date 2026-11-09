import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../../ui/elements/buttons/StandardButtons';
import { EditIcon } from '../../../../ui/icons';
import { ActivitySelect, NONE_OPTION, ProgramSelect } from '@/domain/campaign';
import {
  bulkFieldUpdates,
  bulkFieldValue,
  hasBulkFieldChange,
  type BulkFieldChange,
} from './bulkFieldChange';
import { runInboundBatch } from '../inboundShipmentUpdate';
import type { LineActionProps } from './DeleteLinesAction';

// Bulk change program / activity on the selected lines (spec S3 →
// line-selection actions). Two INDEPENDENT fields, and each is applied only if
// the user touched it: a field left alone is absent from the batch, so setting
// one never disturbs the other (bulkFieldChange). The SAME two pickers the line
// editor uses, asked of the selection instead of one line — Program narrows to
// the selected items (offering only what they all share), Activity is the
// store-wide register either way.
type Phase = 'confirm' | 'working' | 'error';

export interface ChangeCampaignProgramActionProps extends LineActionProps {
  /**
   * The items of the selected lines — what the program list is narrowed to,
   * exactly as the line editor narrows to the one item it edits. Campaigns are
   * store-wide, so the Activity field takes nothing from this.
   */
  selectedItemIds: () => string[];
}

export const ChangeCampaignProgramAction: Component<
  ChangeCampaignProgramActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<EditIcon />}
        disabled={props.disabled}
        data-testid="change-campaign-button"
        onClick={() => setOpen(true)}
      >
        {t('label.program-activity')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (
  props: ChangeCampaignProgramActionProps & { onClose: () => void }
) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  // Untouched until the user picks (or picks and then clears) — see
  // BulkFieldChange. Both start untouched, so opening the dialog and applying
  // without choosing anything changes nothing.
  const [campaignId, setCampaignId] = createSignal<BulkFieldChange>();
  const [programId, setProgramId] = createSignal<BulkFieldChange>();
  const fields = () => ({ programId: programId(), campaignId: campaignId() });
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('working');
    const outcome = await runInboundBatch(props.storeId, props.isExternal, {
      updateInboundShipmentLines: props.selectedIds().map(id => ({
        id,
        ...bulkFieldUpdates(fields()),
      })),
    });
    if (!outcome) return setPhase('confirm'); // handled globally
    if (outcome.errors.size > 0) {
      props.onError(outcome.errors);
      setErrorMessage([...outcome.errors.values()][0]);
      setPhase('error');
      return;
    }
    props.onChanged();
    props.onClose();
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'working'}
      onClose={props.onClose}
      icon={<EditIcon />}
      testId="change-campaign-modal"
      title={t('label.program-activity')}
      // Room for the two selects' open listboxes inside the dialog (#1029) —
      // the activity select is the bottom-most field.
      minBodyHeightRem={20}
      actionsLead={
        <Show when={phase() === 'error'}>
          <Alert severity="error">{errorMessage()}</Alert>
        </Show>
      }
      actions={
        <Switch
          fallback={
            <>
              <CancelButton
                data-testid="dialog-button-cancel"
                onClick={props.onClose}
              />
              <Button
                variant="primary"
                confirms="plain"
                data-testid="dialog-button-ok"
                loading={phase() === 'working'}
                // Nothing touched is nothing to do — rather than send every
                // selected line an update that says to change nothing.
                disabled={!hasBulkFieldChange(fields())}
                onClick={() => void run()}
              >
                {t('button.apply')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'error'}>
            <Button confirms="plain" onClick={props.onClose}>
              {t('button.close')}
            </Button>
          </Match>
        </Switch>
      }
    >
      {/* Empty is NOT "none" here — it is the field not being changed, which
          is why each list carries None as a row of its own. */}
      <ProgramSelect
        noneOption
        placeholder={t('label.leave-unchanged')}
        storeId={props.storeId}
        itemIds={props.selectedItemIds()}
        programId={bulkFieldValue(programId(), NONE_OPTION)}
        onChange={program => setProgramId({ value: program?.id ?? null })}
        inputTestId="field-program"
      />
      <ActivitySelect
        noneOption
        placeholder={t('label.leave-unchanged')}
        campaignId={bulkFieldValue(campaignId(), NONE_OPTION)}
        onChange={campaign => setCampaignId({ value: campaign?.id ?? null })}
        inputTestId="field-activity"
      />
    </Dialog>
  );
};
