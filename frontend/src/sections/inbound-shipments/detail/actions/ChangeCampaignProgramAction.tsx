import {
  createResource,
  createSignal,
  Match,
  Show,
  Switch,
  type Component,
} from 'solid-js';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../../ui/elements/buttons/StandardButtons';
import { Select } from '../../../../ui/elements/selectors/Select';
import { Spinner } from '../../../../ui/elements/feedback/Spinner';
import { EditIcon } from '../../../../ui/icons';
import {
  InboundCampaigns,
  InboundPrograms,
} from '../inboundShipmentLookups.generated';
import { runInboundBatch } from '../inboundShipmentUpdate';
import type { LineActionProps } from './DeleteLinesAction';

// Bulk change campaign / program on the selected lines (spec S3 →
// line-selection actions). Batch update using the NullableStringUpdate wrappers
// (empty choice clears). Campaigns + programs are fetched on open.
type Phase = 'confirm' | 'working' | 'error';

export const ChangeCampaignProgramAction: Component<
  LineActionProps
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
        {t('label.campaign-program')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (props: LineActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [campaignId, setCampaignId] = createSignal('');
  const [programId, setProgramId] = createSignal('');
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const [data] = createResource(async () => {
    const [campaigns, programs] = await Promise.all([
      graphqlFetch(InboundCampaigns, { storeId: props.storeId }),
      graphqlFetch(InboundPrograms, { storeId: props.storeId }),
    ]);
    return {
      campaigns:
        campaigns.kind === 'success' &&
        campaigns.data.campaigns.__typename === 'CampaignConnector'
          ? campaigns.data.campaigns.nodes
          : [],
      programs:
        programs.kind === 'success' &&
        programs.data.programs.__typename === 'ProgramConnector'
          ? programs.data.programs.nodes
          : [],
    };
  });

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('working');
    const outcome = await runInboundBatch(props.storeId, props.isExternal, {
      updateInboundShipmentLines: props.selectedIds().map(id => ({
        id,
        campaignId: { value: campaignId() || null },
        programId: { value: programId() || null },
      })),
    });
    if (!outcome) return props.onClose();
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
      title={t('label.campaign-program')}
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
      <Show when={!data.loading} fallback={<Spinner center />}>
        <Select
          label={t('label.campaign')}
          value={campaignId()}
          onValueChange={setCampaignId}
          options={[
            { value: '', label: t('label.none') },
            ...(data()?.campaigns ?? []).map(c => ({
              value: c.id,
              label: c.name,
            })),
          ]}
        />
        <Select
          label={t('label.program')}
          value={programId()}
          onValueChange={setProgramId}
          options={[
            { value: '', label: t('label.none') },
            ...(data()?.programs ?? []).map(p => ({
              value: p.id,
              label: p.name,
            })),
          ]}
        />
      </Show>
    </Dialog>
  );
};
