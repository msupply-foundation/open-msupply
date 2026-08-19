import { createSignal, Match, Show, Switch } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { TrashIcon } from '@/ui/icons';
import { DeleteRnrForm } from '../../list/rnrForms.generated';
import type { RnrFormNode } from '../rnrFormUpdate';

// The side panel's whole-record delete (spec/rnr-forms/rules.md § deleting;
// ui-surface S3 § side panel; OMS-REG-REPL-07.47): drafts only — disabled once
// finalised — with the program+period confirmation; success navigates back to
// the list (the navigation is the confirmation, no toast).

type Phase = 'confirm' | 'deleting' | 'error';

export const DeleteRnrFormAction: Component<{
  storeId: string;
  node: RnrFormNode;
  disabled: boolean;
}> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');

  const close = () => {
    if (phase() === 'deleting') return;
    setOpen(false);
    setPhase('confirm');
  };

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('deleting');
    const result = await graphqlFetch(DeleteRnrForm, {
      storeId: props.storeId,
      id: props.node.id,
    });
    if (result.kind !== 'success') {
      setPhase('error');
      return;
    }
    navigate(`/${params.storeId}/replenishment/r-and-r-forms`, {
      replace: true,
    });
  };

  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        disabled={props.disabled}
        data-testid="delete-rnr-form-button"
        onClick={() => setOpen(true)}
      >
        {t('label.delete')}
      </Button>
      <Show when={open()}>
        <Dialog
          open
          dismissable={phase() !== 'deleting'}
          onClose={close}
          icon={<TrashIcon />}
          testId="confirmation-modal"
          title={t('heading.are-you-sure')}
          description={
            <Switch
              fallback={t('messages.confirm-delete-rnr-form', {
                programName: props.node.programName,
                period: props.node.period.name,
              })}
            >
              <Match when={phase() === 'error'}>
                <Alert severity="error">{t('error.something-wrong')}</Alert>
              </Match>
            </Switch>
          }
          actions={
            <Switch
              fallback={
                <>
                  <CancelButton onClick={close} />
                  <Button
                    variant="danger"
                    confirms="plain"
                    data-testid="confirmation-modal-ok"
                    loading={phase() === 'deleting'}
                    onClick={() => void run()}
                  >
                    {t('button.ok')}
                  </Button>
                </>
              }
            >
              <Match when={phase() === 'error'}>
                <Button variant="secondary" confirms="plain" onClick={close}>
                  {t('button.close')}
                </Button>
              </Match>
            </Switch>
          }
        />
      </Show>
    </>
  );
};
