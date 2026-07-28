import { createSignal, onMount, Show, type JSX } from 'solid-js';
import { createStore, reconcile, unwrap } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { Text } from '../../../../ui/elements/typography/Text';
import { DataTable } from '../../../../ui/elements/table/DataTable';
import { createTableConfig } from '../../../../api/createTableConfig';
import { ProgressList } from '../../../../ui/sync/ProgressList';
import { GenerateSupplierReturnLines } from '../supplierReturnDetail.generated';
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
// The shared wizard context-row layout (stacks below the compact breakpoint).
import styles from './ReturnItemsModal.module.css';

// S4, from-shipment mode — the return-items modal launched from an inbound
// shipment's "Return selected lines" (spec/supplier-returns/ui-surface.md S4;
// rules § creation — from an originating inbound shipment; REPL-06 .1/.28,
// SMV-06 .12).
//
// Distinct from the per-item ReturnItemsModal: the draft set comes from the
// SELECTED shipment stock lines (across items) via generateSupplierReturnLines;
// there is no item picker / add-batch / Save-&-next; and saving CREATES the
// return (insertSupplierReturn with inboundShipmentId) — born SHIPPED, linked,
// stock issued (contract § creation — auto-ship). Save spins while the insert
// runs, then goes STRAIGHT to the new return — no intermediary confirmation
// screen. Shares the two-step wizard and the inline grids with the per-item
// modal (returnLineColumns).

type Step = 'quantity' | 'reason';

export interface ReturnFromShipmentModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  /** The originating inbound shipment — recorded permanently on the return. */
  inboundShipmentId: string;
  /** Its human number — seeds the pre-filled reference. */
  inboundShipmentInvoiceNumber: number;
  /** The shipment's supplier — the return's other party. */
  supplierId: string;
  supplierName: string;
  /** The selected inbound-shipment stock line ids to build drafts from. */
  stockLineIds: () => string[];
  /** The created (SHIPPED) return's id — the host navigates to its detail. */
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
      inboundShipmentId={props.inboundShipmentId}
      inboundShipmentInvoiceNumber={props.inboundShipmentInvoiceNumber}
      supplierId={props.supplierId}
      supplierName={props.supplierName}
      stockLineIds={props.stockLineIds}
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
  // The pre-filled reference is a UI default; its copy mislabels the source as
  // an outbound shipment (captured as-is — a copy quirk, not a rule; rules
  // § creation — from an originating inbound shipment).
  const [reference, setReference] = createSignal(
    t('messages.default-supplier-return-reference', {
      invoiceNumber: props.inboundShipmentInvoiceNumber,
    })
  );
  const [message, setMessage] = createSignal<
    { severity: 'error' | 'warning'; text: string } | undefined
  >();

  const tableConfig = createTableConfig({
    tableId: 'supplier-return-from-shipment-edit',
  });

  // Edit ONE field of ONE line (fine-grained store write). Any edit clears the
  // step message.
  const update: UpdateLine = (id, field, value) => {
    const index = draft.findIndex(line => line.id === id);
    if (index >= 0) setDraft(index, field, value as never);
    setMessage(undefined);
  };

  // Seed the draft from the selected inbound-shipment stock lines
  // (generateSupplierReturnLines' stockLineIds — contract § draft-line
  // generation): fresh candidates, quantity-to-return zero. None are "existing"
  // (no return persisted yet), so a zeroed line is simply dropped at save —
  // never a delete (rules § line rules).
  const loadDrafts = async () => {
    const result = await graphqlFetch(GenerateSupplierReturnLines, {
      storeId: props.storeId,
      input: {
        stockLineIds: props.stockLineIds(),
        itemId: null,
        returnId: null,
      },
    });
    // The response union's only member is the connector, so any failure here is
    // the global unexpected-error modal's — stay in the loading phase behind it.
    if (result.kind !== 'success') return;
    setDraft(
      reconcile(
        seedDrafts(
          result.data.generateSupplierReturnLines.nodes,
          new Set<string>()
        ),
        { key: 'id' }
      )
    );
    setLoadingLines(false);
  };

  onMount(() => void loadDrafts());

  // Step-1 gating (create mode; ui-surface S4, REPL-06 .29): nothing to return
  // blocks with the add-quantities notice. There is no existing-line-removal
  // path here — nothing is persisted yet, so a zeroed line is just dropped.
  const gateStep1 = (): boolean => {
    if (validateStep1(draft.slice()) === 'no-quantity') {
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

  const onSave = async () => {
    if (saving()) return; // re-entry guard
    setSaving(true);
    setMessage(undefined);
    const result = await createReturnFromShipment(props.storeId, {
      id: crypto.randomUUID(),
      supplierId: props.supplierId,
      inboundShipmentId: props.inboundShipmentId,
      theirReference: reference(),
      // Only quantity-bearing lines are sent; the server drops the rest and
      // auto-ships (contract § creation).
      supplierReturnLines: toLineInputs(draft.map(line => unwrap(line))),
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
    // Straight to the new return — Save keeps its spinner until the host
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
      actions={
        // D55 — dialog footers are icon-less verbs: Cancel / Back / Next step /
        // Save (never OK).
        <>
          <Show
            when={step() === 'reason'}
            fallback={
              <Button
                variant="secondary"
                data-testid="dialog-button-cancel"
                onClick={props.onClose}
              >
                {t('button.cancel')}
              </Button>
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
                data-testid="dialog-button-ok"
                disabled={draft.length === 0}
                onClick={onNextStep}
              >
                {t('button.next-step')}
              </Button>
            }
          >
            <Button
              loading={saving()}
              data-testid="dialog-button-ok"
              onClick={() => void onSave()}
            >
              {t('button.save')}
            </Button>
          </Show>
        </>
      }
    >
      {/* The wizard's step indicator — the shared determinate progress list;
          reaching the reason step completes "Select quantity" (ui-surface S4
          § layout). */}
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
      {/* Context row: who the goods go back to (read-only) and the return's
          supplier reference, pre-filled. One field per row below the compact
          breakpoint — the ReturnItemsModal's shared contextRow. */}
      <div class={styles.contextRow}>
        <FieldRow label={t('label.return-to')}>
          <Text variant="body">{props.supplierName}</Text>
        </FieldRow>
        <FieldRow label={t('label.supplier-reference')}>
          <TextField
            label={t('label.supplier-reference')}
            hideLabel
            size="small"
            value={reference()}
            onInput={e => setReference(e.currentTarget.value)}
          />
        </FieldRow>
      </div>
      <Show
        when={step() === 'reason'}
        fallback={
          <DataTable
            columns={quantityColumns(update)}
            rows={draft.filter(() => true)}
            rowKey={line => line.id}
            loading={loadingLines()}
            showFullScreen={false}
            config={tableConfig.config()}
            setConfig={tableConfig.setConfig}
            emptyMessage={t('error.no-supplier-return-items')}
          />
        }
      >
        <DataTable
          columns={reasonColumns(update)}
          rows={reasonRows()}
          rowKey={line => line.id}
          showFullScreen={false}
          config={tableConfig.config()}
          setConfig={tableConfig.setConfig}
          emptyMessage={t('error.no-supplier-return-items')}
        />
      </Show>
    </Dialog>
  );
};
