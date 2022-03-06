import React, { FC, useState, useEffect } from 'react';
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
  useCurrency,
  useTableStore,
} from '@openmsupply-client/common';
import { NameSearchModal } from '@openmsupply-client/system';
import { getStatusTranslator, isOutboundDisabled } from '../../utils';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { useOutbounds, useCreateOutbound, useUpdateOutbound } from '../api';
import { OutboundRowFragment } from '../api/operations.generated';

const useDisableOutboundRows = (rows?: OutboundRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows?.filter(isOutboundDisabled).map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

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
  useDisableOutboundRows(data?.nodes);

  const { c } = useCurrency();
  const columns = useColumns<OutboundRowFragment>(
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
