import {
  createMemo,
  createResource,
  createSignal,
  Show,
  type Component,
} from 'solid-js';
import { graphqlFetch } from '../../../../api/graphql';
import { gated } from '../../../../api/gated';
import { createTableConfig } from '../../../../api/createTableConfig';
import { t } from '../../../../intl';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import {
  formatCurrencyCell,
  getCellDefinition,
  sumBy,
} from '../../../../ui/elements/table/tableHelpers';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { ConfirmDialog } from '../../../../ui/elements/feedback/ConfirmDialog';
import { IconButton } from '../../../../ui/elements/buttons/IconButton';
import { TrashIcon } from '../../../../ui/icons';
import { ServiceChargesModal } from '../../../../domain/invoice';
import {
  InboundServiceLines,
  type InboundServiceLinesResult,
} from '../inboundShipmentDetail.generated';
import {
  fetchInboundServiceCharges,
  saveInboundServiceCharges,
} from '../modals/inboundServiceCharges';

type ServiceLine = Extract<
  InboundServiceLinesResult['invoiceLines'],
  { __typename: 'InvoiceLineConnector' }
>['nodes'][number];

/** Which way the service-charges editor is open: on a new charge, or as-is. */
export type ServiceChargesEditor = 'add' | 'edit';

// The detail "Service charges" tab (spec S3 tabs → Service charges): the
// shipment's SERVICE lines, read-only — a row click or the header's Add charge
// opens the shared editor (S6); each row deletes on confirm.
export const InboundServiceChargesPanel: Component<{
  storeId: string;
  invoiceId: string;
  isExternal: boolean;
  disabled: boolean;
  /** The store has a service item; undefined while that is still loading. */
  configured: boolean | undefined;
  editor: ServiceChargesEditor | undefined;
  onEditorChange: (editor: ServiceChargesEditor | undefined) => void;
  /** A charge was written — the shipment's totals need a re-read. */
  onChanged: () => void;
}> = props => {
  const [pendingDelete, setPendingDelete] = createSignal<ServiceLine>();
  const [errorMessage, setErrorMessage] = createSignal<string>();
  const tableConfig = createTableConfig({
    tableId: 'inbound-shipment-service-charges',
  });

  const [data, { refetch }] = createResource(
    () => ({ storeId: props.storeId, invoiceId: props.invoiceId }),
    async v => {
      const result = await graphqlFetch(InboundServiceLines, {
        storeId: v.storeId,
        filter: {
          invoiceId: { equalTo: v.invoiceId },
          type: { equalTo: 'SERVICE' },
        },
      });
      return result.kind === 'success' &&
        result.data.invoiceLines.__typename === 'InvoiceLineConnector'
        ? result.data.invoiceLines.nodes
        : undefined;
    }
  );
  // Mounted when the tab opens, under the already-open screen — never suspend.
  const rows = (): ServiceLine[] => gated(data) ?? [];

  const afterWrite = () => {
    void refetch();
    props.onChanged();
  };

  const confirmDelete = async () => {
    // Captured before ConfirmDialog's onClose clears it.
    const line = pendingDelete();
    if (!line) return;
    setErrorMessage(undefined);
    const result = await saveInboundServiceCharges(
      props.storeId,
      props.isExternal,
      props.invoiceId,
      { inserts: [], updates: [], deletes: [{ id: line.id }] }
    );
    if (result.ok) afterWrite();
    else if (result.message) setErrorMessage(result.message);
  };

  const columns = createMemo((): Column<ServiceLine, never>[] => [
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
      ...getCellDefinition('total'),
    },
    {
      c: { accessor: line => line.taxPercentage ?? 0, id: 'taxPercentage' },
      header: () => t('label.tax'),
      ...getCellDefinition('taxPercentage'),
    },
    {
      c: { key: 'totalAfterTax' },
      header: () => t('label.total'),
      ...getCellDefinition('total'),
      footer: () =>
        formatCurrencyCell(sumBy(rows(), line => line.totalAfterTax)),
    },
    ...(props.disabled
      ? []
      : [
          {
            c: { id: 'delete' },
            header: () => t('label.delete'),
            cell: info => (
              <IconButton
                data-testid="service-charge-delete-button"
                icon={<TrashIcon />}
                label={t('label.delete')}
                variant="danger"
                onClick={e => {
                  e.stopPropagation();
                  setPendingDelete(info.row.original);
                }}
              />
            ),
          } satisfies Column<ServiceLine, never>,
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
          props.configured === false
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
        fetchCharges={() =>
          fetchInboundServiceCharges(props.storeId, props.invoiceId)
        }
        save={async batch => {
          const result = await saveInboundServiceCharges(
            props.storeId,
            props.isExternal,
            props.invoiceId,
            batch
          );
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
