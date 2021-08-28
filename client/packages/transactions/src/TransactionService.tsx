import React, { FC } from 'react';
import { useNavigate, useParams, Routes, Route } from 'react-router-dom';
import { request } from 'graphql-request';

import { getQuery, mutation, useDraftDocument } from './api';
import {
  Book,
  Button,
  Download,
  MenuDots,
  Portal,
  Printer,
  QueryProps,
  RemoteDataTable,
  RouteBuilder,
  useQuery,
  useFormatDate,
  useHostContext,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { getColumns } from './columns';

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
  const queryProps = { first: 10, offset: 0, sort: undefined, desc: false };
  const { appBarButtonsRef } = useHostContext();
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
  const formatDate = useFormatDate();
  const t = useTranslation();
  const columns = getColumns(formatDate);
  const fetchData = (props: QueryProps) => {
    queryProps.first = props.first;
    queryProps.offset = props.offset;
    return refetch();
  };

  return (
    <>
      <Portal container={appBarButtonsRef.current}>
        <>
          <Button startIcon={<Book />}>{t('button.docs')}</Button>
          <Button startIcon={<Download />}>{t('button.export')}</Button>
          <Button startIcon={<Printer />}>{t('button.print')}</Button>
          <Button startIcon={<MenuDots />}>{t('button.more')}</Button>
        </>
      </Portal>
      <RemoteDataTable<Transaction>
        columns={columns}
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
