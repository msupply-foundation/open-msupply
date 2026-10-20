import {
  createMemo,
  createResource,
  createSignal,
  Show,
  type JSX,
} from 'solid-js';
import { gated } from '@/api/gated';
import { createTableConfig } from '@/api/createTableConfig';
import { t } from '@/intl';
import { DataTable, type Column } from '@/ui/elements/table/DataTable';
import {
  formatCurrencyCell,
  getCellDefinition,
  sumBy,
} from '@/ui/elements/table/tableHelpers';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { remToPx } from '@/ui/utils/rem';
import { TrashIcon } from '@/ui/icons';
import {
  ServiceChargesModal,
  type ServiceChargeSaveResult,
  type ServiceChargeSeed,
  type ServiceItem,
} from './ServiceChargesModal';
import type { ServiceChargeBatch } from './serviceChargeBatch';

// Read-only service lines opening ServiceChargesModal; the host injects writes.

/** The fields the table shows; the host's generated line type satisfies it. */
export type ServiceChargeLine = {
  id: string;
  itemName: string;
  note?: string | null;
  totalBeforeTax: number;
  taxPercentage?: number | null;
  totalAfterTax: number;
};

/** Which way the service-charges editor is open: on a new charge, or as-is. */
export type ServiceChargesEditor = 'add' | 'edit';

export interface ServiceChargesTableProps<T extends ServiceChargeLine> {
  tableId: string;
  storeId: string;
  invoiceId: string;
  /** The hosting shipment is read-only (its editability gate). */
  disabled: boolean;
  /** The store's service items; undefined while the host loads them. */
  serviceItems: ServiceItem[] | undefined;
  editor: ServiceChargesEditor | undefined;
  onEditorChange: (editor: ServiceChargesEditor | undefined) => void;
  /** The shipment's SERVICE lines; undefined = the read failed. */
  fetchLines: (invoiceId: string) => Promise<T[] | undefined>;
  /** The editor's seed (ServiceChargesModalProps.fetchCharges). */
  fetchCharges: () => Promise<ServiceChargeSeed[] | undefined>;
  save: (batch: ServiceChargeBatch) => Promise<ServiceChargeSaveResult>;
  deleteLine: (line: T) => Promise<ServiceChargeSaveResult>;
  /** A charge was written — the host's totals need a re-read. */
  onChanged?: () => void;
}

export const ServiceChargesTable = <T extends ServiceChargeLine>(
  props: ServiceChargesTableProps<T>
): JSX.Element => {
  const [pendingDelete, setPendingDelete] = createSignal<T>();
  const [deletingId, setDeletingId] = createSignal<string>();
  const [errorMessage, setErrorMessage] = createSignal<string>();
  const tableConfig = createTableConfig({
    tableId: props.tableId,
    defaultConfig: { base: { columnPinning: { right: ['actions'] } } },
  });

  const [data, { refetch }] = createResource(
    () => props.invoiceId,
    invoiceId => props.fetchLines(invoiceId)
  );
  // Mounted when its tab opens, under the already-open screen — never suspend.
  const rows = (): T[] => gated(data) ?? [];

  const afterWrite = () => {
    setErrorMessage(undefined);
    void refetch();
    props.onChanged?.();
  };

  const confirmDelete = async () => {
    // Captured before ConfirmDialog's onClose clears it.
    const line = pendingDelete();
    if (!line || deletingId()) return;
    setErrorMessage(undefined);
    setDeletingId(line.id);
    const result = await props.deleteLine(line);
    setDeletingId(undefined);
    if (result.ok) afterWrite();
    else if (result.message) setErrorMessage(result.message);
  };

  const columns = createMemo((): Column<T, never>[] => [
    {
      c: { key: 'itemName' },
      header: () => t('label.item'),
      ...getCellDefinition('itemName'),
      footer: () => t('label.total'),
    },
    {
      c: { accessor: line => line.note ?? '', id: 'note' },
      header: () => t('label.description'),
      ...getCellDefinition('description'),
    },
    {
      c: { key: 'totalBeforeTax' },
      header: () => t('label.amount'),
      ...getCellDefinition('totalBeforeTax'),
    },
    {
      c: { accessor: line => line.taxPercentage ?? 0, id: 'taxPercentage' },
      header: () => t('label.tax'),
      ...getCellDefinition('taxPercentage'),
    },
    {
      c: { key: 'totalAfterTax' },
      header: () => t('label.total'),
      ...getCellDefinition('totalAfterTax'),
      footer: () =>
        formatCurrencyCell(sumBy(rows(), line => line.totalAfterTax)),
    },
    ...(props.disabled
      ? []
      : [
          {
            c: { id: 'actions' },
            header: () => t('label.delete'),
            meta: { align: 'right' },
            size: remToPx(5),
            cell: info => (
              <IconButton
                data-testid="service-charge-delete-button"
                bordered
                size="small"
                variant="danger"
                icon={<TrashIcon />}
                label={t('label.delete')}
                disabled={deletingId() === info.row.original.id}
                onClick={e => {
                  e.stopPropagation();
                  setPendingDelete(() => info.row.original);
                }}
              />
            ),
          } satisfies Column<T, never>,
        ]),
  ]);

  return (
    <>
      <Show when={errorMessage()}>
        {message => <Alert severity="error">{message()}</Alert>}
      </Show>
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={line => line.id}
        loading={data.loading}
        onRowClick={() => props.onEditorChange('edit')}
        emptyMessage={
          props.serviceItems?.length === 0
            ? t('messages.no-service-charges-configured')
            : t('messages.no-service-charges')
        }
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        configIsDefault={tableConfig.isConfigDefault()}
        onSaveGlobalDefault={
          tableConfig.canSaveGlobalDefault()
            ? tableConfig.saveGlobalTableConfig
            : undefined
        }
      />

      <ServiceChargesModal
        open={props.editor !== undefined}
        addOnOpen={props.editor === 'add'}
        onClose={() => props.onEditorChange(undefined)}
        storeId={props.storeId}
        disabled={props.disabled}
        serviceItems={props.serviceItems}
        fetchCharges={props.fetchCharges}
        save={async batch => {
          const result = await props.save(batch);
          if (result.ok) afterWrite();
          return result;
        }}
      />

      <Show when={pendingDelete()}>
        {line => (
          <ConfirmDialog
            open
            title={t('heading.are-you-sure')}
            message={t('messages.confirm-delete-service-charge', {
              name: line().itemName,
            })}
            confirmLabel={t('button.delete')}
            confirmVariant="danger"
            onConfirm={() => void confirmDelete()}
            onClose={() => setPendingDelete(undefined)}
          />
        )}
      </Show>
    </>
  );
};
