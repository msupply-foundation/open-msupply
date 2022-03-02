import React, { FC, useState } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  getNameAndColorColumn,
  TableProvider,
  createTableStore,
  InvoiceNodeStatus,
  generateUUID,
  useTranslation,
  useCurrency,
} from '@openmsupply-client/common';
import { NameSearchModal } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getStatusTranslator } from '../../utils';
import { useInbounds, useCreateInbound, InboundRowFragment } from '../api';

export const InboundListView: FC = () => {
  const { mutate } = useCreateInbound();
  const navigate = useNavigate();
  const { c } = useCurrency();
  const {
    data,
    isLoading,
    sortBy,
    onChangeSortBy,
    onChangePage,
    pagination,
    filter,
  } = useInbounds();

  const t = useTranslation();

  const columns = useColumns<InboundRowFragment>(
    [
      [getNameAndColorColumn(), { setter: () => {} }],
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
          mutate({
            id: generateUUID(),
            otherPartyId: name?.id,
          });
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

export const ListView: FC = () => {
  return (
    <TableProvider createStore={createTableStore}>
      <InboundListView />
    </TableProvider>
  );
};
