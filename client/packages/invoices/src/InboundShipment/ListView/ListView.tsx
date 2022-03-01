import React, { FC, useState } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  useListData,
  getNameAndColorColumn,
  TableProvider,
  createTableStore,
  InvoiceNodeStatus,
  useNotification,
  generateUUID,
  useTranslation,
  useCurrency,
  useAuthContext,
} from '@openmsupply-client/common';
import { getInboundShipmentListViewApi } from './api';
import { NameSearchModal } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { InvoiceRow } from '../../types';
import { getStatusTranslator } from '../../utils';
import { useInboundShipmentApi } from '../api';

export const InboundListView: FC = () => {
  const navigate = useNavigate();
  const { c } = useCurrency();
  const { error } = useNotification();
  const api = useInboundShipmentApi();
  const { storeId } = useAuthContext();
  const {
    totalCount,
    data,
    isLoading,
    onDelete,
    onUpdate,
    sortBy,
    onChangeSortBy,
    onCreate,
    onChangePage,
    pagination,
    filter,
    invalidate,
  } = useListData(
    {
      initialSortBy: { key: 'otherPartyName' },
      initialFilterBy: { type: { equalTo: 'INBOUND_SHIPMENT' } },
    },
    'invoice',
    getInboundShipmentListViewApi(api, storeId)
  );
  const t = useTranslation();

  const columns = useColumns<InvoiceRow>(
    [
      [getNameAndColorColumn(), { setter: onUpdate }],
      [
        'status',
        {
          formatter: status =>
            getStatusTranslator(t)(status as InvoiceNodeStatus),
        },
      ],
      'invoiceNumber',
      'createdDatetime',
      'allocatedDatetime',
      'comment',
      [
        'totalAfterTax',
        {
          accessor: ({ rowData }) => c(rowData.pricing.totalAfterTax).format(),
        },
      ],
      'selection',
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  const [open, setOpen] = useState(false);

  return (
    <>
      <NameSearchModal
        type="supplier"
        open={open}
        onClose={() => setOpen(false)}
        onChange={async name => {
          setOpen(false);

          const createInvoice = async () => {
            const invoice = {
              id: generateUUID(),
              otherPartyId: name?.id,
            };

            try {
              const result = await onCreate(invoice);
              invalidate();
              navigate(result);
            } catch (e) {
              const errorSnack = error(
                'Failed to create invoice! ' + (e as Error).message
              );
              errorSnack();
            }
          };

          createInvoice();
        }}
      />

      <Toolbar onDelete={onDelete} data={data} filter={filter} />
      <AppBarButtons onCreate={setOpen} />

      <DataTable
        pagination={{ ...pagination, total: totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(row.id);
        }}
      />
    </>
  );
};

export const ListView: FC = () => {
  return (
    <TableProvider createStore={createTableStore}>
      <InboundListView />
    </TableProvider>
  );
};
