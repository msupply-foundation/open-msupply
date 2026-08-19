import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import {
  CancelButton,
  CloseButton,
  OkButton,
} from '@/ui/elements/buttons/StandardButtons';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { StatusIndicator } from '@/ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { CheckIcon } from '@/ui/icons';
import { statusLabel } from '../list/rnrFormStatus';
import type { RnrFormNode } from './rnrFormUpdate';

// The detail footer (spec/rnr-forms/ui-surface.md S3 § footer): Close back to
// the list, the Draft → Finalised lifecycle indicator, and Finalise with its
// confirmation phase machine (OMS-REG-REPL-07.33/.46):
//   - error lines → the dialog explains and its confirm WALKS to the first
//     error line instead of finalising (no server call);
//   - otherwise → confirm → save-all-then-finalise; success is the form going
//     read-only (closure is the confirmation — no toast); failure keeps the
//     dialog open (the global surface owns the description).

type Phase = 'errors' | 'confirm' | 'finalising' | 'error';

export const RnrFormStatusFooter: Component<{
  node: RnrFormNode;
  /** Any draft line currently violating the balance rules. */
  hasErrorLines: () => boolean;
  /** Scroll the table to the first error line (the errors phase's confirm). */
  onShowFirstError: () => void;
  /** Flush edits, finalise, splice the result; resolves false on failure. */
  onFinalise: () => Promise<boolean>;
}> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');

  const finalised = () => props.node.status === 'FINALISED';

  const openDialog = () => {
    setPhase(props.hasErrorLines() ? 'errors' : 'confirm');
    setOpen(true);
  };

  const close = () => {
    if (phase() === 'finalising') return;
    setOpen(false);
  };

  const run = async () => {
    if (phase() === 'errors') {
      setOpen(false);
      props.onShowFirstError();
      return;
    }
    if (phase() !== 'confirm') return;
    setPhase('finalising');
    const ok = await props.onFinalise();
    if (ok) setOpen(false);
    else setPhase('error');
  };

  const steps = () => [
    { label: t('label.draft') },
    { label: t('label.finalised') },
  ];

  return (
    <ContentFooter testId="actions-footer">
      <StatusIndicator steps={steps()} current={finalised() ? 1 : 0} />
      <ContentFooterActions>
        <CloseButton
          data-testid="close-button"
          onClick={() =>
            navigate(`/${params.storeId}/replenishment/r-and-r-forms`)
          }
        />
        <Button
          icon={<CheckIcon />}
          data-testid="finalise-rnr-form-button"
          disabled={finalised()}
          onClick={openDialog}
        >
          {finalised() ? statusLabel('FINALISED') : t('status.finalise')}
        </Button>
      </ContentFooterActions>
      <Show when={open()}>
        <Dialog
          open
          dismissable={phase() !== 'finalising'}
          onClose={close}
          testId="confirmation-modal"
          title={t('heading.are-you-sure')}
          description={
            <Switch fallback={t('messages.confirm-finalise-rnr')}>
              <Match when={phase() === 'errors'}>
                <Alert severity="warning" testId="finalise-errors-warning">
                  {t('error.rnr-has-errors')}
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
                  <Show when={phase() !== 'finalising'}>
                    <CancelButton onClick={close} />
                  </Show>
                  <OkButton
                    data-testid="confirmation-modal-ok"
                    loading={phase() === 'finalising'}
                    onClick={() => void run()}
                  />
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
    </ContentFooter>
  );
};
