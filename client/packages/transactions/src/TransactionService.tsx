import React, { FC } from 'react';
import { useNavigate, useParams, Routes, Route } from 'react-router-dom';
import { request } from 'graphql-request';

import { getQuery, mutation, useDraftDocument } from './api';
import {
  Button,
  Download,
  MenuDots,
  Portal,
  Printer,
  QueryProps,
  RemoteDataTable,
  RouteBuilder,
  SortingRule,
  useQuery,
  useColumns,
  ColumnFormat,
  useHostContext,
  useNotification,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

export type Transaction = {
  customer: string;
  supplier: string;
  total: string;
  id: string;
  date: string;
};

const queryFn = (id: string) => async (): Promise<Transaction> => {
  const result = await request('http://localhost:4000', getQuery(), { id });
  const { transaction } = result;
  return transaction;
};

const mutationFn = async (updated: Transaction): Promise<Transaction> => {
  const patch = { transactionPatch: updated };
  const result = await request('http://localhost:4000', mutation, patch);
  const { updateTransaction } = result;
  return updateTransaction;
};

const Transaction: FC = () => {
  const { id } = useParams();
  const { draft, setDraft, save } = useDraftDocument<Transaction>(
    ['transaction', id],
    queryFn(id ?? ''),
    mutationFn
  );

  return draft ? (
    <>
      <div>
        <input
          value={draft?.customer}
          onChange={event =>
            setDraft({ ...draft, customer: event?.target.value })
          }
        />
      </div>
      <div>
        <span>{JSON.stringify(draft, null, 4) ?? ''}</span>
      </div>
      <div>
        <button onClick={() => save()}>OK</button>
      </div>
    </>
  ) : null;
};

const Transactions: FC = () => {
  const queryProps = { first: 10, offset: 0, sort: undefined, desc: false } as {
    first: number;
    offset: number;
    sort?: string;
    desc?: boolean;
  };
  const { appBarButtonsRef } = useHostContext();
  const { info, success, warning } = useNotification();
  const listQuery = async () => {
    const { first, offset, sort, desc } = queryProps;
    const sortParameters = sort ? `, sort: ${sort}, desc: ${!!desc}` : '';

    const { transactions } = await request(
      'http://localhost:4000',
      `
      query Query {
        transactions(first: ${first}, offset: ${offset}${sortParameters}) {
          data {
            id
            date
            customer
            supplier
            total
          }
          totalLength
      }
    }`
    );

    return transactions;
  };

  const { refetch } = useQuery(['transaction', 'list'], listQuery, {
    enabled: false,
  });

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
  const fetchData = (props: QueryProps<Transaction>) => {
    queryProps.first = props.first;
    queryProps.offset = props.offset;
    if (props.sortBy && props.sortBy.length) {
      const sortBy = props.sortBy[0];
      queryProps.sort = sortBy?.id;
      queryProps.desc = sortBy?.desc;
    }
    return refetch();
  };

  return (
    <>
      <Portal container={appBarButtonsRef.current}>
        <>
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
        initialSortBy={initialSortBy}
        onFetchData={fetchData}
        onRowClick={row => {
          navigate(`/customers/customer-invoice/${row.id}`);
        }}
      />
    </>
  );
};

const TransactionService: FC = () => {
  const customerInvoicesRoute = RouteBuilder.create(
    AppRoute.CustomerInvoice
  ).build();

  const customerInvoiceRoute = RouteBuilder.create(AppRoute.CustomerInvoice)
    .addPart(':id')
    .build();

  return (
    <Routes>
      <Route path={customerInvoicesRoute} element={<Transactions />} />
      <Route path={customerInvoiceRoute} element={<Transaction />} />
    </Routes>
  );
};

export default TransactionService;
