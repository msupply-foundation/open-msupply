import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../../ui/elements/buttons/StandardButtons';
import { EditIcon } from '../../../../ui/icons';
import { ActivitySelect, ProgramSelect } from '@/domain/campaign';
import { runInboundBatch } from '../inboundShipmentUpdate';
import type { LineActionProps } from './DeleteLinesAction';

// Bulk change program / activity on the selected lines (spec S3 →
// line-selection actions). Batch update using the NullableStringUpdate wrappers
// (an empty field clears). Two independent fields, each applied at its own
// value — and the SAME two pickers the line editor uses, asked of the selection
// instead of one line: Program narrows to the selected items (offering only
// what they all share), Activity is the store-wide register either way.
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
  // Empty is "no program" / "no activity" — applying clears the field on every
  // selected line, as the pickers' own ✕ clears it on one.
  const [campaignId, setCampaignId] = createSignal<string>();
  const [programId, setProgramId] = createSignal<string>();
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('working');
    const outcome = await runInboundBatch(props.storeId, props.isExternal, {
      updateInboundShipmentLines: props.selectedIds().map(id => ({
        id,
        campaignId: { value: campaignId() ?? null },
        programId: { value: programId() ?? null },
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
      <ProgramSelect
        storeId={props.storeId}
        itemIds={props.selectedItemIds()}
        programId={programId()}
        onChange={program => setProgramId(program?.id)}
        inputTestId="field-program"
      />
      <ActivitySelect
        campaignId={campaignId()}
        onChange={campaign => setCampaignId(campaign?.id)}
        inputTestId="field-activity"
      />
    </Dialog>
  );
};
