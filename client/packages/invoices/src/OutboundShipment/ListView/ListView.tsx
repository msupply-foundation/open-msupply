import React, { FC, useState } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  getNameAndColorColumn,
  TableProvider,
  createTableStore,
  useNotification,
  useTranslation,
  InvoiceNodeStatus,
  generateUUID,
} from '@openmsupply-client/common';
import { NameSearchModal } from '@openmsupply-client/system/src/Name';
import { getStatusTranslator } from '../../utils';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { useOutbounds, useCreateOutbound, useUpdateOutbound } from '../api';
import { OutboundShipmentRowFragment } from '../api/operations.generated';

export const OutboundShipmentListViewComponent: FC = () => {
  const { mutate: onUpdate } = useUpdateOutbound();
  const { mutate: onCreate } = useCreateOutbound();
  const t = useTranslation('common');
  const navigate = useNavigate();
  const { error } = useNotification();

  const {
    data,
    isLoading,
    sortBy,
    onChangeSortBy,
    onChangePage,
    pagination,
    filter,
  } = useOutbounds();

  const columns = useColumns<OutboundShipmentRowFragment>(
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
      'comment',
      [
        'totalAfterTax',
        {
          accessor: ({ rowData }) => rowData.pricing.totalAfterTax,
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
        type="customer"
        open={open}
        onClose={() => setOpen(false)}
        onChange={async name => {
          setOpen(false);
          try {
            await onCreate({ id: generateUUID(), otherPartyId: name?.id });
          } catch (e) {
            const errorSnack = error(
              'Failed to create invoice! ' + (e as Error).message
            );
            errorSnack();
          }
        }}
      />

      <Toolbar filter={filter} />
      <AppBarButtons onCreate={setOpen} />

      <DataTable
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.nodes ?? []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(String(row.invoiceNumber));
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
