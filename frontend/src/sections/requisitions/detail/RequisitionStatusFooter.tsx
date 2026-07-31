import {
  createSignal,
  Match,
  Show,
  Switch,
  type Component,
} from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { t, tPlural } from '../../../intl';
import { hasPermission } from '../../../store/storeContext';
import { Button } from '../../../ui/elements/buttons/Button';
import { SplitButton } from '../../../ui/elements/buttons/SplitButton';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { StatusIndicator } from '../../../ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import {
  ArrowRightIcon,
  CheckIcon,
  PlusCircleIcon,
  XCircleIcon,
} from '../../../ui/icons';
import {
  createShipmentFromRequisition,
  saveRequisitionFields,
} from './requisitionUpdate';
import { currentStatusStep, statusSteps } from './requisitionDetailStatus';
import type { RequisitionInfoFragment } from './requisitionDetail.generated';

// The detail footer (spec/requisitions S2 § footer): the lifecycle indicator
// over New → Finalised, and the status/raise SPLIT button — Confirm New
// (always disabled) · Create shipment · Confirm Finalised. The preselected
// primary is Create shipment while any line remains unsupplied (or no line
// has a supply quantity yet); Confirm Finalised once every line is fully
// supplied. Hidden when the requisition is not editable — except when only
// APPROVAL blocks editing, in which case it shows disabled (rules › raising a
// shipment).
//
// Create shipment: missing permission → an explanatory notice, no call;
// nothing remaining → a blocking alert distinguishing "no supply quantities
// yet" from "all lines fulfilled", no call; otherwise a confirmation, then
// creation and navigation to the new shipment. Confirm Finalised: always a
// confirmation — warning (with the not-fully-supplied count and the
// no-further-shipments note) while any remainder is positive, plain
// otherwise; the save is an order-level save carrying the whole-record
// validation of any header edit (rules › finalising), so a reasons rejection
// flags the offending lines' Reason cells. Failures surface inline in the
// open dialog, never a toast (S6).

// The finalise dialog's phases; the raise dialog's cover its three
// client-side refusals too.
type FinalisePhase = 'confirm' | 'saving' | 'error';
type RaisePhase =
  | 'permission'
  | 'blocked'
  | 'confirm'
  | 'creating'
  | 'error';

export interface RequisitionStatusFooterProps {
  storeId: string;
  node: RequisitionInfoFragment;
  /** The standing editability gate (New, approval clear, store enabled). */
  editable: boolean;
  /**
   * Approval alone blocks editing → the button shows DISABLED instead of
   * hiding (spec S2 § footer).
   */
  approvalBlocked: boolean;
  /** A finalise succeeded — splice the returned node back (no refetch). */
  onSaved: (node: RequisitionInfoFragment) => void;
  /**
   * The lines a reasons rejection named, so the detail flags their Reason
   * cells; called with [] on any other outcome to clear stale flags.
   */
  onReasonsNotProvided: (lineIds: string[]) => void;
}

export const RequisitionStatusFooter: Component<
  RequisitionStatusFooterProps
> = props => {
  const navigate = useNavigate();
  // The user's explicit menu pick; undefined = follow the supply state.
  const [choice, setChoice] = createSignal<string>();
  const [finaliseOpen, setFinaliseOpen] = createSignal(false);
  const [finalisePhase, setFinalisePhase] =
    createSignal<FinalisePhase>('confirm');
  // The warn-variant copy is decided when the dialog OPENS (the count could
  // move under a live refetch while it is up).
  const [warnCount, setWarnCount] = createSignal(0);
  const [raiseOpen, setRaiseOpen] = createSignal(false);
  const [raisePhase, setRaisePhase] = createSignal<RaisePhase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal<string>();

  // The raise pre-check and the finalise warning count (contract › raising a
  // shipment): the lines with a positive remainder, server-computed.
  const remainingCount = () => props.node.linesRemainingToSupply.totalCount;
  // No line has a supply quantity at all — the other nothing-to-raise message.
  const noSupplyYet = () =>
    props.node.lines.nodes.every(line => line.supplyQuantity === 0);

  // The preselected primary action (spec S2 § footer): Create shipment while
  // any line remains unsupplied (or none has a supply quantity); Confirm
  // Finalised once every line is fully supplied.
  const defaultChoice = () =>
    remainingCount() > 0 || noSupplyYet() ? 'shipment' : 'finalised';
  const selected = () => choice() ?? defaultChoice();

  const options = () => [
    {
      value: 'new',
      label: t('button.save-and-confirm-status', { status: t('status.new') }),
      disabled: true,
    },
    { value: 'shipment', label: t('button.create-shipment') },
    {
      value: 'finalised',
      label: t('button.save-and-confirm-status', {
        status: t('status.finalised'),
      }),
    },
  ];

  // --- Create shipment (rules › raising a shipment) -------------------------

  const openRaise = () => {
    setErrorMessage(undefined);
    // The two client-side refusals, in the reference's order: permission
    // first (its own permission, distinct from requisition-mutate), then the
    // nothing-remaining explanation — no server call for either.
    if (!hasPermission('REQUISITION_CREATE_OUTBOUND_SHIPMENT'))
      setRaisePhase('permission');
    else if (remainingCount() === 0) setRaisePhase('blocked');
    else setRaisePhase('confirm');
    setRaiseOpen(true);
  };

  const runRaise = async () => {
    if (raisePhase() !== 'confirm') return;
    setRaisePhase('creating');
    const result = await createShipmentFromRequisition(
      props.storeId,
      props.node.id
    );
    if (result.kind === 'created') {
      setRaiseOpen(false);
      navigate(
        `/${props.storeId}/distribution/outbound-shipment/${result.invoiceId}`
      );
      return;
    }
    if (result.kind === 'error') {
      // Failure keeps the confirmation open with the error inline (S6).
      setErrorMessage(result.message);
      setRaisePhase('error');
      return;
    }
    // Transport/unexpected → the global modal already surfaced it.
    setRaisePhase('confirm');
  };

  // --- Confirm Finalised (rules › finalising) --------------------------------

  const openFinalise = () => {
    setErrorMessage(undefined);
    setWarnCount(remainingCount());
    setFinalisePhase('confirm');
    setFinaliseOpen(true);
  };

  const runFinalise = async () => {
    if (finalisePhase() !== 'confirm') return;
    setFinalisePhase('saving');
    // An order-level save with the whole-record validation of any header
    // edit: reasons guard (naming lines), emergency cap, cannot-edit.
    const result = await saveRequisitionFields(props.storeId, {
      id: props.node.id,
      status: 'FINALISED',
    });
    if (result.kind === 'saved') {
      props.onReasonsNotProvided([]);
      props.onSaved(result.node);
      setFinaliseOpen(false);
      return;
    }
    if (result.kind === 'error') {
      props.onReasonsNotProvided(result.reasonLineIds);
      setErrorMessage(result.message);
      setFinalisePhase('error');
      return;
    }
    setFinalisePhase('confirm');
  };

  const onAction = () => {
    if (selected() === 'shipment') openRaise();
    else if (selected() === 'finalised') openFinalise();
  };

  return (
    <ContentFooter>
      <StatusIndicator
        steps={statusSteps(props.node)}
        current={currentStatusStep(props.node.status)}
      />
      <ContentFooterActions>
        {/* Hidden when not editable — except approval-only blocking, which
            shows it disabled (spec S2 § footer). */}
        <Show when={props.editable || props.approvalBlocked}>
          <SplitButton
            icon={
              selected() === 'shipment' ? (
                <PlusCircleIcon />
              ) : (
                <ArrowRightIcon />
              )
            }
            options={options()}
            value={selected()}
            onValueChange={setChoice}
            // The status-change convention: a menu pick SELECTS; the main
            // button acts.
            menuSelectsOnly
            onAction={onAction}
            menuLabel={t('button.save-and-confirm-status', {
              status: t('status.finalised'),
            })}
            disabled={props.approvalBlocked}
            disabledTitle={t('error.cannot-edit-requisition')}
            testId="status-change-button"
          />
        </Show>
      </ContentFooterActions>

      {/* Create shipment — the confirmation, or one of the two client-side
          refusals (permission / nothing remaining), or the inline failure. */}
      <Show when={raiseOpen()}>
        <Dialog
          open
          dismissable={raisePhase() !== 'creating'}
          onClose={() => setRaiseOpen(false)}
          testId="create-shipment-modal"
          title={
            raisePhase() === 'confirm' || raisePhase() === 'creating'
              ? t('heading.create-outbound-shipment')
              : t('heading.cannot-do-that')
          }
          description={
            <Switch
              fallback={t('messages.create-outbound-from-requisition')}
            >
              <Match when={raisePhase() === 'permission'}>
                <Alert severity="warning">
                  {t('error.no-create-outbound-shipment-permission')}
                </Alert>
              </Match>
              <Match when={raisePhase() === 'blocked'}>
                {/* Distinguishes "no supply quantities yet" from "all lines
                    fulfilled" (rules › raising a shipment). */}
                <Alert severity="warning">
                  {noSupplyYet()
                    ? t('message.all-lines-have-no-supply-quantity')
                    : t('message.all-lines-have-been-fulfilled')}
                </Alert>
              </Match>
              <Match when={raisePhase() === 'error'}>
                <Alert severity="error">{errorMessage()}</Alert>
              </Match>
            </Switch>
          }
          actions={
            <Switch
              fallback={
                <>
                  <Show when={raisePhase() === 'confirm'}>
                    <Button
                      variant="secondary"
                      icon={<XCircleIcon />}
                      onClick={() => setRaiseOpen(false)}
                    >
                      {t('button.cancel')}
                    </Button>
                  </Show>
                  <Button
                    icon={<CheckIcon />}
                    data-testid="confirmation-modal-ok"
                    loading={raisePhase() === 'creating'}
                    onClick={() => void runRaise()}
                  >
                    {t('button.ok')}
                  </Button>
                </>
              }
            >
              {/* The refusals and the failure have nothing to submit. */}
              <Match
                when={
                  raisePhase() === 'permission' ||
                  raisePhase() === 'blocked' ||
                  raisePhase() === 'error'
                }
              >
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
                  onClick={() => setRaiseOpen(false)}
                >
                  {t('button.close')}
                </Button>
              </Match>
            </Switch>
          }
        />
      </Show>

      {/* Confirm Finalised — the warn variant while any remainder is
          positive, the plain confirm otherwise (a never-supplied line has a
          zero remainder, so an unsupplied requisition gets the plain one). */}
      <Show when={finaliseOpen()}>
        <Dialog
          open
          dismissable={finalisePhase() !== 'saving'}
          onClose={() => setFinaliseOpen(false)}
          testId="confirmation-modal"
          title={
            warnCount() > 0
              ? t('heading.confirm-finalise')
              : t('heading.are-you-sure')
          }
          description={
            <Switch
              fallback={
                <Show
                  when={warnCount() > 0}
                  fallback={t('messages.confirm-status-as', {
                    status: t('status.finalised'),
                  })}
                >
                  {/* The no-further-shipments note above the count message
                      (spec S2 § footer). */}
                  <Alert severity="info">{t('info.no-shipment')}</Alert>
                  {tPlural('messages.confirm-not-fully-supplied', warnCount())}
                </Show>
              }
            >
              <Match when={finalisePhase() === 'error'}>
                <Alert severity="error">{errorMessage()}</Alert>
              </Match>
            </Switch>
          }
          actions={
            <Switch
              fallback={
                <>
                  <Show when={finalisePhase() === 'confirm'}>
                    <Button
                      variant="secondary"
                      icon={<XCircleIcon />}
                      onClick={() => setFinaliseOpen(false)}
                    >
                      {t('button.cancel')}
                    </Button>
                  </Show>
                  <Button
                    icon={<CheckIcon />}
                    data-testid="confirmation-modal-ok"
                    loading={finalisePhase() === 'saving'}
                    onClick={() => void runFinalise()}
                  >
                    {t('button.ok')}
                  </Button>
                </>
              }
            >
              <Match when={finalisePhase() === 'error'}>
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
                  onClick={() => setFinaliseOpen(false)}
                >
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
