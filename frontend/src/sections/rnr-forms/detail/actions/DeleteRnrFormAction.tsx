import { createSignal, Match, Show, Switch } from 'solid-js';
import type { Component } from 'solid-js';
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
// finalised — with the program+period confirmation. The action reports via
// onDeleted and the VIEW navigates (the navigation is the confirmation, no
// toast) — the sibling record-delete shape.

type Phase = 'confirm' | 'deleting' | 'error';

export const DeleteRnrFormAction: Component<{
  storeId: string;
  node: RnrFormNode;
  disabled: boolean;
  /** Deletion succeeded — the owning view navigates back to the list. */
  onDeleted: () => void;
}> = props => {
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
    props.onDeleted();
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
                  <Show when={phase() === 'confirm'}>
                    <CancelButton
                      data-testid="dialog-button-cancel"
                      onClick={close}
                    />
                  </Show>
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
