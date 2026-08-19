import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { CheckIcon } from '@/ui/icons';
import { isFinalised } from '../../list/rnrFormStatus';
import type { RnrFormNode } from '../rnrFormUpdate';

// The Finalise action (spec/rnr-forms/rules.md § finalise; ui-surface S3 §
// footer; OMS-REG-REPL-07.33/.46) — a self-contained peer of the record
// actions, owning the footer button and the confirm phase machine:
//   - error lines → the dialog explains and its confirm WALKS to the first
//     error line instead of finalising (no server call);
//   - otherwise → confirm → save-all-then-finalise; success is the form going
//     read-only (closure is the confirmation — no toast); failure keeps the
//     dialog open (the global surface owns the description).
// The button stays visible-and-disabled once finalised (spec-owned gating:
// ui-surface S3 § footer pins the relabel to status.finalised).

type Phase = 'errors' | 'confirm' | 'finalising' | 'error';

export const FinaliseRnrFormAction: Component<{
  node: RnrFormNode;
  /** Any draft line currently violating the balance rules. */
  hasErrorLines: () => boolean;
  /** Scroll the table to the first error line (the errors phase's confirm). */
  onShowFirstError: () => void;
  /** Flush edits, finalise, splice the result; resolves false on failure. */
  onFinalise: () => Promise<boolean>;
}> = props => {
  const [open, setOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');

  const finalised = () => isFinalised(props.node.status);

  const openDialog = () => {
    setPhase(props.hasErrorLines() ? 'errors' : 'confirm');
    setOpen(true);
  };

  const close = () => {
    if (phase() === 'finalising') return;
    setOpen(false);
  };

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('finalising');
    const ok = await props.onFinalise();
    if (ok) setOpen(false);
    else setPhase('error');
  };

  return (
    <>
      <Button
        icon={<CheckIcon />}
        data-testid="finalise-rnr-form-button"
        disabled={finalised()}
        onClick={openDialog}
      >
        {finalised() ? t('status.finalised') : t('status.finalise')}
      </Button>
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
                // confirm / finalising: Cancel (hidden while finalising) + a
                // confirm that NAMES the save-and-finalise it performs
                // (controls › footer button identity — never a bare OK for a
                // save).
                <>
                  <Show when={phase() === 'confirm'}>
                    <CancelButton
                      data-testid="dialog-button-cancel"
                      onClick={close}
                    />
                  </Show>
                  <Button
                    variant="primary"
                    confirms="plain"
                    data-testid="confirmation-modal-ok"
                    loading={phase() === 'finalising'}
                    onClick={() => void run()}
                  >
                    {t('button.save-and-confirm-status', {
                      status: t('status.finalised'),
                    })}
                  </Button>
                </>
              }
            >
              {/* Errors: the confirm names the jump it performs instead. */}
              <Match when={phase() === 'errors'}>
                <CancelButton
                  data-testid="dialog-button-cancel"
                  onClick={close}
                />
                <Button
                  variant="primary"
                  confirms="plain"
                  data-testid="confirmation-modal-ok"
                  onClick={() => {
                    setOpen(false);
                    props.onShowFirstError();
                  }}
                >
                  {t('button.show-error-lines')}
                </Button>
              </Match>
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
