import { createSignal, Match, Show, Switch } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t, tPlural } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { TrashIcon } from '@/ui/icons';
import { DeleteRnrForm } from '../rnrForms.generated';
import type { RnrFormRowFragment } from '../rnrForms.generated';

// The list's bulk delete (spec/rnr-forms/rules.md § deleting; ui-surface S1;
// OMS-REG-REPL-07.47/.48): drafts only. A selection containing a finalised
// form opens the dialog in a BLOCKED state that explains the rule and calls
// nothing — the affordance stays clickable-and-explaining rather than
// dead-disabled. The server exposes only single-id deletes, so the action
// fires one call per id; the rows leaving the list is the confirmation
// (controls › action feedback — no toast).

type Phase = 'blocked' | 'confirm' | 'deleting' | 'error';

export const DeleteRnrFormsAction: Component<{
  storeId: string;
  selectedRows: () => RnrFormRowFragment[];
  onDeleted: () => void;
}> = props => {
  const [open, setOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');

  const count = () => props.selectedRows().length;

  const openDialog = () => {
    setPhase(
      props.selectedRows().some(row => row.status === 'FINALISED')
        ? 'blocked'
        : 'confirm'
    );
    setOpen(true);
  };

  const close = () => {
    if (phase() === 'deleting') return;
    setOpen(false);
  };

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('deleting');
    for (const row of props.selectedRows()) {
      const result = await graphqlFetch(DeleteRnrForm, {
        storeId: props.storeId,
        id: row.id,
      });
      if (result.kind !== 'success') {
        // The global modal owns the description; this dialog just stops
        // claiming progress (a partial delete is visible in the list).
        setPhase('error');
        return;
      }
    }
    setOpen(false);
    props.onDeleted();
  };

  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-rnr-forms-button"
        onClick={openDialog}
      >
        {t('button.delete-lines')}
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
              fallback={tPlural('messages.confirm-delete-rnr-forms', count())}
            >
              <Match when={phase() === 'blocked'}>
                <Alert severity="warning" testId="delete-rnr-forms-blocked">
                  {t('messages.cannot-delete-rnr-form')}
                </Alert>
              </Match>
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
              <Match when={phase() === 'blocked' || phase() === 'error'}>
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
