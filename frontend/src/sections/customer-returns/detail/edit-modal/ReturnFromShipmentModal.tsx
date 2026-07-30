import { generateUUID } from '../../../../uuid';
import { createSignal, onMount, Show, type JSX } from 'solid-js';
import { createStore, reconcile, unwrap } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import {
  CancelButton,
  DialogSaveButton,
} from '../../../../ui/elements/buttons/StandardButtons';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { LabelledValue } from '../../../../ui/elements/typography/LabelledValue';
import { ContentContainer } from '../../../../ui/layout/ContentContainer/ContentContainer';
import { HStack } from '../../../../ui/layout/Stack/HStack';
import { DataTable } from '../../../../ui/elements/table/DataTable';
import { createTableConfig } from '../../../../api/createTableConfig';
import { ProgressList } from '../../../../ui/sync/ProgressList';
import { GenerateCustomerReturnLines } from '../customerReturnDetail.generated';
import { createReturnFromShipment } from '../returnUpdate';
import {
  reasonStepLines,
  seedDrafts,
  toLineInputs,
  validateStep1,
  type DraftReturnLine,
} from './returnLineLogic';
import {
  quantityColumns,
  reasonColumns,
  type UpdateLine,
} from './returnLineColumns';

// S4, from-shipment mode — the return-items modal launched from an outbound
// shipment's "Return selected lines" (spec/customer-returns/ui-surface.md S4;
// rules § creation — from an originating outbound shipment; FL5 / AC-C4–C7).
//
// Distinct from the per-item ReturnItemsModal: the draft set comes from the
// SELECTED shipment lines (across items) via generateCustomerReturnLines, with
// packs-issued populated; there is no item picker / add-batch / OK-&-next; and
// saving CREATES the return (insertCustomerReturn with outboundShipmentId) —
// born VERIFIED, linked, stock introduced (contract § creation — auto-verify).
// OK spins while the insert runs, then goes STRAIGHT to the new return — no
// intermediary confirmation screen. Shares the two-step wizard and the inline
// grids with the per-item modal (returnLineColumns).

type Step = 'quantity' | 'reason';

export interface ReturnFromShipmentModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  /** The originating outbound shipment — recorded permanently on the return. */
  outboundShipmentId: string;
  /** Its human number — seeds the "From outbound shipment #N" reference. */
  outboundShipmentInvoiceNumber: number;
  /** The shipment's customer — the return's other party. */
  customerId: string;
  customerName: string;
  /** The selected outbound-shipment stock line ids to build drafts from. */
  outboundShipmentLineIds: () => string[];
  /** The created (VERIFIED) return's id — the host navigates to its detail. */
  onCreated: (returnId: string) => void;
}

// Mount-while-open so each open seeds a fresh draft off the current selection
// (the reference-modal shape).
export const ReturnFromShipmentModal = (
  props: ReturnFromShipmentModalProps
): JSX.Element => (
  <Show when={props.open}>
    <Body
      onClose={props.onClose}
      storeId={props.storeId}
      outboundShipmentId={props.outboundShipmentId}
      outboundShipmentInvoiceNumber={props.outboundShipmentInvoiceNumber}
      customerId={props.customerId}
      customerName={props.customerName}
      outboundShipmentLineIds={props.outboundShipmentLineIds}
      onCreated={props.onCreated}
    />
  </Show>
);

type BodyProps = Omit<ReturnFromShipmentModalProps, 'open'>;

const Body = (props: BodyProps): JSX.Element => {
  // Draft state as a STORE so editing one field of one line writes just that
  // path (kdd/state-management).
  const [draft, setDraft] = createStore<DraftReturnLine[]>([]);
  const [step, setStep] = createSignal<Step>('quantity');
  const [saving, setSaving] = createSignal(false);
  const [loadingLines, setLoadingLines] = createSignal(true);
  const [reference, setReference] = createSignal(
    t('messages.default-customer-return-reference', {
      invoiceNumber: props.outboundShipmentInvoiceNumber,
    })
  );
  const [message, setMessage] = createSignal<
    { severity: 'error' | 'warning'; text: string } | undefined
  >();

  const tableConfig = createTableConfig({
    tableId: 'customer-return-from-shipment-edit',
  });

  // Edit ONE field of ONE line (fine-grained store write). Any edit clears the
  // step message.
  const update: UpdateLine = (id, field, value) => {
    const index = draft.findIndex(line => line.id === id);
    if (index >= 0) setDraft(index, field, value as never);
    setMessage(undefined);
  };

  // Seed the draft from the selected outbound-shipment lines
  // (generateCustomerReturnLines' outboundShipmentLineIds — contract §
  // draft-line generation): fresh ids, quantity returned zero, packs issued
  // carried. None are "existing" (no return persisted yet), so a zeroed line is
  // simply dropped at save — never a delete (rules § line rules).
  const loadDrafts = async () => {
    const result = await graphqlFetch(GenerateCustomerReturnLines, {
      storeId: props.storeId,
      input: {
        outboundShipmentLineIds: props.outboundShipmentLineIds(),
        existingLinesInput: null,
      },
    });
    // The response union's only member is the connector, so any failure here
    // is the global unexpected-error modal's (spec: Unexpected API Errors) —
    // stay in the loading phase behind it rather than showing an empty grid.
    if (result.kind !== 'success') return;
    setDraft(
      reconcile(
        seedDrafts(
          result.data.generateCustomerReturnLines.nodes,
          new Set<string>()
        ),
        { key: 'id' }
      )
    );
    setLoadingLines(false);
  };

  onMount(() => void loadDrafts());

  // Step-1 gating (create mode; ui-surface S4, AC-C6/AC-E3's UI half): a
  // returned line's pack size below one blocks; nothing to return blocks with
  // the add-quantities notice. There is no existing-line-removal path here —
  // nothing is persisted yet, so a zeroed line is just dropped (no warning).
  const gateStep1 = (): boolean => {
    const verdict = validateStep1(draft.slice());
    if (verdict === 'invalid-pack-size') {
      setMessage({
        severity: 'error',
        text: t('messages.alert-invalid-pack-size'),
      });
      return false;
    }
    if (verdict === 'no-quantity') {
      setMessage({
        severity: 'error',
        text: t('messages.alert-zero-return-quantity'),
      });
      return false;
    }
    return true;
  };

  const onNextStep = () => {
    if (!gateStep1()) return;
    setStep('reason');
    setMessage(undefined);
  };

  const onOk = async () => {
    if (saving()) return; // re-entry guard
    setSaving(true);
    setMessage(undefined);
    const result = await createReturnFromShipment(props.storeId, {
      id: generateUUID(),
      customerId: props.customerId,
      outboundShipmentId: props.outboundShipmentId,
      theirReference: reference(),
      // Only quantity-bearing lines are sent; the server drops the rest and
      // auto-verifies (contract § creation).
      customerReturnLines: toLineInputs(draft.map(line => unwrap(line))),
    });
    // 'forbidden' / 'failed' already raised the global modal (D38) — close so
    // the flow isn't a dead end behind it.
    if (result.kind === 'forbidden' || result.kind === 'failed') {
      setSaving(false);
      props.onClose();
      return;
    }
    if (result.kind === 'error') {
      setSaving(false);
      setMessage({ severity: 'error', text: result.message });
      return;
    }
    // Straight to the new return — OK keeps its spinner until the host
    // navigates (which unmounts this modal); no confirmation screen.
    props.onCreated(result.id);
  };

  const reasonRows = () => reasonStepLines(draft.slice());

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size="large"
      testId="return-from-shipment-modal"
      title={t('heading.return-items')}
      actionsLead={
        <Show when={message()}>
          {m => <Alert severity={m().severity}>{m().text}</Alert>}
        </Show>
      }
      // The footer (ui-surface S4 § layout): Cancel (step 1) / Back (step 2) ·
      // Next step / Save — the standard, icon-less dialog buttons (D55). Back
      // and Next step carry their own labels, so they stay plain icon-less
      // Buttons; there is no Save & next in the from-shipment flow.
      actions={
        <>
          <Show
            when={step() === 'reason'}
            fallback={
              <CancelButton
                data-testid="dialog-button-cancel"
                onClick={props.onClose}
              />
            }
          >
            <Button
              variant="secondary"
              data-testid="dialog-button-cancel"
              onClick={() => {
                setStep('quantity');
                setMessage(undefined);
              }}
            >
              {t('button.back')}
            </Button>
          </Show>
          <Show
            when={step() === 'reason'}
            fallback={
              <Button
                variant="primary"
                data-testid="dialog-button-ok"
                disabled={draft.length === 0}
                onClick={onNextStep}
              >
                {t('button.next-step')}
              </Button>
            }
          >
            <DialogSaveButton
              loading={saving()}
              data-testid="dialog-button-ok"
              onClick={() => void onOk()}
            />
          </Show>
        </>
      }
    >
      {/* The wizard's step indicator — the shared determinate progress list;
            reaching the reason step completes "Select quantity" (ui-surface
            S4 § layout). Capped to a reading measure, as in the per-item modal:
            the list divides its width between steps, so full-bleed in a
            workbench-width dialog the markers fly to opposite edges. */}
      <ContentContainer size="form">
        <ProgressList
          variant="secondary"
          steps={[
            {
              label: t('label.select-quantity'),
              started: true,
              finished: step() === 'reason',
            },
            {
              label: t('label.select-reason'),
              started: step() === 'reason',
              finished: false,
            },
          ]}
        />
      </ContentContainer>
      {/* Context row: who the goods come back from and the return's customer
            reference, pre-filled "From outbound shipment #N" (rules § creation —
            a UI default). The per-item modal's field cluster, same shape: label
            above control, each field sized to itself, hugging the inline-start
            and wrapping when the dialog goes full-screen. */}
      <HStack gap="lg" align="start" wrap>
        <LabelledValue
          label={t('label.return-from')}
          variant="field"
          size="small"
        >
          {props.customerName}
        </LabelledValue>
        <TextField
          label={t('label.customer-ref')}
          size="small"
          value={reference()}
          onInput={e => setReference(e.currentTarget.value)}
        />
      </HStack>
      <Show
        when={step() === 'reason'}
        fallback={
          <DataTable
            columns={quantityColumns(update)}
            rows={draft.filter(() => true)}
            rowKey={line => line.id}
            loading={loadingLines()}
            showFullScreen={false}
            minBodyRem={20}
            config={tableConfig.config()}
            setConfig={tableConfig.setConfig}
            emptyMessage={t('error.no-customer-return-items')}
          />
        }
      >
        <DataTable
          columns={reasonColumns(update)}
          rows={reasonRows()}
          rowKey={line => line.id}
          showFullScreen={false}
          minBodyRem={20}
          config={tableConfig.config()}
          setConfig={tableConfig.setConfig}
          emptyMessage={t('error.no-customer-return-items')}
        />
      </Show>
    </Dialog>
  );
};
