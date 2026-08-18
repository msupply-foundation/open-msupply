import { createResource, createSignal, Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { generateUUID } from '@/uuid';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { DataTable, type Column } from '@/ui/elements/table/DataTable';
import {
  CommentHeader,
  getCellDefinition,
  getNumberCell,
} from '@/ui/elements/table/tableHelpers';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { Stack } from '@/ui/layout/Stack/Stack';
import { PlusCircleIcon } from '@/ui/icons';
import { NameSearch, type NameOption } from '@/domain/name';
import {
  CreateOrderRequisitions,
  InsertOrderFromRequisition,
  type CreateOrderRequisitionsResult,
} from './createOrder.generated';
import { statusLabel } from '../requisitionStatus';

// The Create-order flow (spec/requisitions S3b): raise an internal order — a
// request requisition, owned by the internal-orders vertical — for what the
// store is about to supply, drawn from an existing requisition. A two-step
// flow in one action: pick a supplier (visible, store-backed), then click one
// of the store's non-finalised, still-short requisitions not already
// addressed to that supplier; the order is created Draft, linked back, and
// the caller navigates to it. Preference-gated by the CALLER
// (canCreateInternalOrderFromARequisition, OMS-FUN-DIS-03.16). A failure
// surfaces inline in the modal (ui-standards › action feedback, [D21] — the
// reference's toast is deliberately not copied), with its copy
// (`error.failed-to-create-internal-order`).

type PickerRow = CreateOrderRequisitionsResult['requisitions']['nodes'][number];

export interface CreateOrderActionProps {
  storeId: string;
  /** The order was created — the caller navigates to its detail. */
  onCreated: (id: string) => void;
}

type Step = 'closed' | 'supplier' | 'pick';

export const CreateOrderAction: Component<CreateOrderActionProps> = props => {
  const [step, setStep] = createSignal<Step>('closed');
  const [supplier, setSupplier] = createSignal<NameOption>();
  const [error, setError] = createSignal<string>();
  const [submitting, setSubmitting] = createSignal(false);

  const open = () => {
    setSupplier();
    setError();
    setSubmitting(false);
    setStep('supplier');
  };
  const close = () => setStep('closed');

  // Step 2's picker read: the still-short requisitions, excluding the chosen
  // supplier's own (contract › creating an internal order). Keyed on the
  // supplier so a re-pick refetches; read non-suspending
  // (kdd/solid-reactivity-pitfalls).
  const [data] = createResource(
    () => (step() === 'pick' ? supplier()?.id : undefined),
    async supplierId => {
      const result = await graphqlFetch(CreateOrderRequisitions, {
        storeId: props.storeId,
        supplierId,
      });
      if (result.kind !== 'success') return undefined;
      return result.data.requisitions.nodes;
    }
  );
  // This resource first fetches mid-interaction inside the open step-2 dialog.
  const rows = (): PickerRow[] => gated(data) ?? [];

  const onSupplier = (picked: NameOption | null) => {
    if (!picked) return;
    setSupplier(picked);
    setStep('pick');
  };

  // Clicking a row raises the internal order and navigates to it
  // (OMS-FUN-DIS-03.17); a rejection keeps the modal open with the error
  // inline (.18).
  const pick = async (row: PickerRow) => {
    if (submitting()) return;
    setSubmitting(true);
    setError();
    const result = await graphqlFetch(InsertOrderFromRequisition, {
      storeId: props.storeId,
      input: {
        id: generateUUID(),
        responseRequisitionId: row.id,
        otherPartyId: supplier()!.id,
      },
    });
    setSubmitting(false);
    if (
      result.kind === 'success' &&
      result.data.insertRequestFromResponseRequisition.__typename ===
        'RequisitionNode'
    ) {
      props.onCreated(result.data.insertRequestFromResponseRequisition.id);
      return;
    }
    if (result.kind === 'success')
      setError(t('error.failed-to-create-internal-order'));
    // Transport / unexpected already surfaced globally; keep the modal open.
  };

  // Column widths ride the shared presets (getCellDefinition) so the picker's
  // columns size and resize like every other table's.
  const columns = (): Column<PickerRow, never>[] => [
    {
      c: { key: 'requisitionNumber' },
      header: () => t('label.number'),
      ...getNumberCell(),
    },
    {
      c: { accessor: row => row.otherPartyName, id: 'otherPartyName' },
      header: () => t('label.customer'),
      ...getCellDefinition('otherPartyName'),
    },
    {
      c: { key: 'createdDatetime' },
      header: () => t('label.created-datetime'),
      ...getCellDefinition('createdDatetime'),
    },
    {
      // Empty for a non-program requisition.
      c: { accessor: row => row.programName ?? '', id: 'programName' },
      header: () => t('label.program'),
    },
    {
      // A transferred requisition's generated "From internal order N" text
      // (rules › origin) reads here.
      c: { accessor: row => row.theirReference ?? '', id: 'theirReference' },
      header: () => t('label.reference'),
      ...getCellDefinition('theirReference'),
    },
    {
      // The standard translated status text — the reference renders the raw
      // wire value here, captured as-is in the spec and deliberately not
      // copied (spec S3b).
      c: { accessor: row => statusLabel(row.status), id: 'status' },
      header: () => t('label.status'),
    },
    {
      c: { key: 'comment' },
      header: () => <CommentHeader />,
      ...getCellDefinition('comment'),
    },
  ];

  return (
    <>
      <Button
        icon={<PlusCircleIcon />}
        data-testid="create-order-button"
        onClick={open}
      >
        {t('button.create-order')}
      </Button>
      {/* The two steps render as always-mounted siblings driven by reactive
          `open` (the CreateInboundShipmentModal pattern): a native <dialog>
          fires its `close` event on unmount, which would report as onClose
          and knock the flow back to 'closed' mid-advance; with `open` driven
          reactively, the closing dialog's onClose is guarded by its own
          open-ness. */}
      {/* Step 1 — the internal supplier search: visible suppliers that are
          themselves stores (rules › creating an internal order). */}
      <Dialog
        open={step() === 'supplier'}
        onClose={close}
        closeButton
        title={t('suppliers')}
        testId="supplier-search-modal"
        // Same frame as the New-requisition modal's General path: a roomy
        // fixed width and minimum body height, so the supplier dropdown opens
        // inside the dialog rather than reshaping it.
        widthRem={44}
        minBodyHeightRem={30}
      >
        <Stack gap="md">
          <FieldRow label={t('label.supplier-name')}>
            <NameSearch
              storeId={props.storeId}
              role="supplier"
              storeBacked
              label={t('label.supplier-name')}
              hideLabel
              clearable={false}
              inputTestId="create-order-supplier"
              onSelect={onSupplier}
            />
          </FieldRow>
        </Stack>
      </Dialog>
      {/* Step 2 — a cancel-only modal whose body is the requisition table;
          clicking a row raises the order. */}
      <Dialog
        open={step() === 'pick'}
        dismissable={!submitting()}
        onClose={close}
        size="large"
        title={t('button.create-order')}
        testId="create-order-modal"
        actionsLead={
          <Show when={error()}>
            <Alert severity="error">{error()}</Alert>
          </Show>
        }
        actions={<CancelButton onClick={close} />}
      >
        {/* Render the table only while the modal is open. The Dialog stays
            mounted (open driven reactively — see the note above), but a
            native <dialog> keeps its closed children in the DOM, so an
            always-rendered table would leak its transient test hooks (a
            second `header-status`, `table-row`, …) onto the list behind it,
            colliding with the list's own (TESTIDS § uniqueness). */}
        <Show when={step() === 'pick'}>
          <DataTable
            columns={columns()}
            rows={rows()}
            rowKey={r => r.id}
            loading={data.loading}
            showFullScreen={false}
            emptyMessage={t('error.no-requisitions-to-create-order-from')}
            onRowClick={row => void pick(row)}
          />
        </Show>
      </Dialog>
    </>
  );
};
