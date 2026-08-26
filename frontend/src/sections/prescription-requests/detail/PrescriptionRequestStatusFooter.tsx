import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Button } from '../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../ui/elements/buttons/StandardButtons';
import { createAction } from '../../../ui/utils/keyActions';
import { ALT_V } from '../../../ui/utils/shortcuts';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { StatusIndicator } from '../../../ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import {
  asRequestStatus,
  isEditable,
  statusIndex,
  statusSteps,
} from '../prescriptionRequestStatus';
import { savePrescriptionRequest } from './prescriptionRequestUpdate';
import type { PrescriptionRequestFieldsFragment } from './prescriptionRequestDetail.generated';

// The detail status footer (spec/prescription-requests/ui-surface.md S3 §
// status footer): the lifecycle crumbs and — while New — the hand-over action
// (AC-R1..R3). One client pre-flight: no lines → a blocking notice, no server
// call (mirroring the server's own no-lines rejection so the common case
// never round-trips). A rejection surfaces in the same dialog as a blocking
// notice — never a toast. There is no Dispensed action: that flip is the
// server's (rules § becoming dispensed).

export interface PrescriptionRequestStatusFooterProps {
  storeId: string;
  node: PrescriptionRequestFieldsFragment;
  /** The hand-over saved — merge the returned node in place. */
  onSaved: (node: PrescriptionRequestFieldsFragment) => void;
}

export const PrescriptionRequestStatusFooter: Component<
  PrescriptionRequestStatusFooterProps
> = props => {
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [working, setWorking] = createSignal(false);
  const [rejection, setRejection] = createSignal<string>();
  const [noLinesOpen, setNoLinesOpen] = createSignal(false);

  const status = () => asRequestStatus(props.node.status);

  const openConfirm = () => {
    // The one sanctioned pre-flight (AC-R1): nothing prescribed blocks with a
    // notice and no server call.
    if (props.node.lines.totalCount === 0) return setNoLinesOpen(true);
    setConfirmOpen(true);
  };

  // Alt+V — update status (spec/keyboard KB-R1's binding table). Declared
  // here because this component owns the control; a SPECIFIC action, gated on
  // this screen. Same inertness as the control: nothing to confirm once past
  // New.
  createAction({
    name: 'button.update-status',
    shortcut: ALT_V,
    run: openConfirm,
    disabled: () => !isEditable(status()),
  });

  const closeDialogs = () => {
    setConfirmOpen(false);
    setRejection(undefined);
  };

  const run = async () => {
    setWorking(true);
    // A retry must not show the previous attempt's verdict.
    setRejection(undefined);
    const outcome = await savePrescriptionRequest(
      props.storeId,
      { id: props.node.id, status: 'READY_TO_DISPENSE' },
      { inSurface: true }
    );
    setWorking(false);
    if (outcome.kind === 'saved') {
      closeDialogs();
      props.onSaved(outcome.node);
      return;
    }
    if (outcome.kind === 'rejected') {
      // The server's verdict shows as a blocking notice in the surface that
      // initiated the save — never a toast.
      setRejection(outcome.description);
      return;
    }
    closeDialogs(); // transport — the global modal has it
  };

  return (
    <ContentFooter>
      <StatusIndicator
        steps={statusSteps(props.node)}
        current={statusIndex(status())}
      />

      <ContentFooterActions>
        {/* Hidden once past New — a permanently dead control is hidden. */}
        <Show when={isEditable(status())}>
          <Button
            data-testid="status-change-button"
            shortcut={ALT_V}
            onClick={openConfirm}
          >
            {t('button.ready-to-dispense')}
          </Button>
        </Show>
      </ContentFooterActions>

      {/* The no-lines blocking notice (AC-R1) — a notice, never a toast. */}
      <Dialog
        open={noLinesOpen()}
        onClose={() => setNoLinesOpen(false)}
        title={t('heading.are-you-sure')}
        testId="confirmation-modal"
        description={<Alert severity="info">{t('messages.no-lines')}</Alert>}
        actions={
          <Button
            confirms="plain"
            data-testid="dialog-button-ok"
            onClick={() => setNoLinesOpen(false)}
          >
            {t('button.ok')}
          </Button>
        }
      />

      {/* The hand-over confirmation (AC-R2); a rejection swaps the message
          for the blocking notice. */}
      <Show when={confirmOpen()}>
        <Dialog
          open
          dismissable={!working()}
          onClose={closeDialogs}
          title={t('heading.are-you-sure')}
          testId="confirmation-modal"
          description={
            <Show
              when={rejection()}
              fallback={t('messages.confirm-ready-to-dispense')}
            >
              {description => <Alert severity="error">{description()}</Alert>}
            </Show>
          }
          actions={
            <Show
              when={!rejection()}
              fallback={
                <Button
                  confirms="plain"
                  data-testid="dialog-button-ok"
                  onClick={closeDialogs}
                >
                  {t('button.close')}
                </Button>
              }
            >
              <Show when={!working()}>
                <CancelButton
                  data-testid="dialog-button-cancel"
                  onClick={closeDialogs}
                />
              </Show>
              <Button
                confirms="plain"
                data-testid="confirmation-modal-ok"
                loading={working()}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </Show>
          }
        />
      </Show>
    </ContentFooter>
  );
};
