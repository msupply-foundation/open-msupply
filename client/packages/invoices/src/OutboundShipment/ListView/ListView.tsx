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
  useTranslation,
} from '@openmsupply-client/common';
import { NameSearchModal } from '@openmsupply-client/system/src/Name';
import { getStatusTranslator } from '../../utils';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getOutboundShipmentListViewApi } from './api';
import { OutboundShipmentStatus, InvoiceRow } from '../../types';

export const OutboundShipmentListViewComponent: FC = () => {
  const t = useTranslation('common');
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
      initialFilterBy: { type: { equalTo: 'OUTBOUND_SHIPMENT' } },
    },
    'invoice',
    getOutboundShipmentListViewApi(api)
  );

  // const onColorUpdate = (row: InvoiceRow, color: Color) => {
  //   onUpdate({ ...row, color: color.hex });
  // };

  const columns = useColumns<InvoiceRow>(
    [
      // getNameAndColorColumn(onColorUpdate),
      'otherPartyName',
      [
        'status',
        {
          formatter: status =>
            getStatusTranslator(t)(status as OutboundShipmentStatus),
        },
      ],
      'invoiceNumber',
      'entryDatetime',
      // 'allocatedDatetime',
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
        type="customer"
        open={open}
        onClose={() => setOpen(false)}
        onChange={async name => {
          setOpen(false);

          const createInvoice = async () => {
            const invoice = {
              id: String(Math.ceil(Math.random() * 1000000)),
              nameId: name?.id,
            };

            try {
              const result = await onCreate(invoice);
              invalidate();
              navigate(`/distribution/outbound-shipment/${result}`);
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
          navigate(`/distribution/outbound-shipment/${row.id}`);
        }}
      />
    </>
  );
};

export const OutboundShipmentListView: FC = () => {
  return (
    <TableProvider createStore={createTableStore}>
      <OutboundShipmentListViewComponent />
    </TableProvider>
  );
};
