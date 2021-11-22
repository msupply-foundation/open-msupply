import React, { FC, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  DataTable,
  useColumns,
  useListData,
  // getNameAndColorColumn,
  TableProvider,
  createTableStore,
  // Color,
  useOmSupplyApi,
  useNotification,
  generateUUID,
} from '@openmsupply-client/common';
import { getInboundShipmentListViewApi } from './api';
// import { InvoiceRow } from '../../types';
import { NameSearchModal } from '@openmsupply-client/system/src/Name';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';

export const InboundListView: FC = () => {
  const navigate = useNavigate();
  const { error } = useNotification();
  const { api } = useOmSupplyApi();

  const {
    totalCount,
    data,
    isLoading,
    onDelete,
    // onUpdate,
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
    getInboundShipmentListViewApi(api)
  );

  const columns = useColumns(
    [
      // getNameAndColorColumn((row: InvoiceRow, color: Color) => {
      //   onUpdate({ ...row, color: color.hex });
      // }),
      'otherPartyName',
      [
        'status',
        {
          // TODO: use translated status string
          formatter: status => String(status),
        },
      ],
      'invoiceNumber',
      'entryDatetime',
      'allocatedDatetime',
      'comment',
      ['totalAfterTax', { accessor: invoice => invoice.pricing.totalAfterTax }],
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
              nameId: name?.id,
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
