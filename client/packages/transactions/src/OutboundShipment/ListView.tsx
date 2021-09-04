import React, { FC, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Portal,
  request,
  Button,
  ColumnFormat,
  Download,
  MenuDots,
  PlusCircle,
  Printer,
  QueryProps,
  useQuery,
  RemoteDataTable,
  useColumns,
  useHostContext,
  useNotification,
  SortingRule,
} from '@openmsupply-client/common';
import { getListQuery } from '../api';

export type Transaction = {
  customer: string;
  supplier: string;
  total: string;
  id?: string;
  date: string;
};

const queryFn = async (queryParams: QueryProps<Transaction>) => {
  const { first, offset, sortBy } = queryParams;

  const { transactions } = await request(
    'http://localhost:4000',
    getListQuery(),
    {
      first,
      offset,
      sort: sortBy?.[0]?.id,
      desc: !!sortBy?.[0]?.desc,
    }
  );

  return transactions;
};

export const OutboundShipmentListView: FC = () => {
  const { appBarButtonsRef } = useHostContext();
  const { info, success, warning } = useNotification();

  const [queryProps, setQueryProps] = useState<QueryProps<Transaction>>({
    first: 10,
    offset: 0,
  });
  const { data: response, isLoading } = useQuery(
    ['transaction', 'list', queryProps],
    () => queryFn(queryProps)
  );

  const navigate = useNavigate();
  const getColumns = useColumns();
  const columns = getColumns<Transaction>([
    { label: 'label.id', key: 'id', sortable: false },
    { label: 'label.date', key: 'date', format: ColumnFormat.date },
    { label: 'label.customer', key: 'customer' },
    { label: 'label.supplier', key: 'supplier' },
    { label: 'label.total', key: 'total' },
  ]);
  const initialSortBy: SortingRule<Transaction>[] = [
    { id: 'date', desc: true },
  ];

  return (
    <>
      <Portal container={appBarButtonsRef.current}>
        <>
          <Button
            icon={<PlusCircle />}
            labelKey="button.new-shipment"
            onClick={() => navigate(`/customers/customer-invoice/new`)}
          />
          <Button
            icon={<Download />}
            labelKey="button.export"
            onClick={success('Downloaded successfully')}
          />
          <Button
            icon={<Printer />}
            labelKey="button.print"
            onClick={info('No printer detected')}
          />
          <Button
            icon={<MenuDots />}
            labelKey="button.more"
            onClick={warning('Do not press this button')}
          />
        </>
      </Portal>
      <RemoteDataTable<Transaction>
        columns={columns}
        data={response?.data || []}
        initialSortBy={initialSortBy}
        isLoading={isLoading}
        onFetchData={setQueryProps}
        onRowClick={row => {
          navigate(`/customers/customer-invoice/${row.id}`);
        }}
        totalLength={response?.totalLength || 0}
      />
    </>
  );
};
