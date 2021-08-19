import React, { FC } from 'react';
import { request } from 'graphql-request';
import { getQuery, mutation, useDraftDocument } from './api';
import { useQuery /* , DataGrid */ } from '@openmsupply-client/common';
import { useNavigate, useParams, Routes, Route } from 'react-router-dom';
import { Table } from './Table';
import { columns } from './columns';

interface Transaction {
  customer: string;
  supplier: string;
  total: string;
  id: string;
  date: string;
}

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

const listQuery = async () => {
  const { transactions } = await request(
    'http://localhost:4000',
    `
    query Query {
    transactions {
      id
      date
      customer
      supplier
      total
    }
}
  `
  );

  return transactions;
};

const Transactions: FC = () => {
  const { data, isLoading } = useQuery(['transaction', 'list'], listQuery);
  const navigate = useNavigate();

  return isLoading ? null : (
    <div style={{ marginTop: 10, minWidth: '100%' }}>
      <Table
        columns={columns}
        data={data}
        onRowClick={row => {
          navigate(`/customers/customer-invoice/${row.id}`);
        }}
      />
    </div>
  );
};

const TransactionService: FC = () => (
  <Routes>
    <Route path="/customer-invoice" element={<Transactions />} />
    <Route path="/customer-invoice/:id" element={<Transaction />} />
  </Routes>
);

export default TransactionService;
