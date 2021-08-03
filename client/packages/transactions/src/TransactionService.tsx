import React, { FC } from 'react';
import { request } from 'graphql-request';
import { getQuery, mutation, useDraftDocument } from './api';
import {
  Routes,
  Route,
  useQuery,
  DataGrid,
  useNavigate,
  useParams,
} from '@openmsupply-client/common';

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
    <div style={{ marginTop: 100 }}>
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
    </div>
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

const columns = [
  {
    field: 'id',
    headerName: 'ID',
    flex: 1,
  },
  {
    field: 'date',
    headerName: 'Date',
    flex: 1,
  },
  {
    field: 'customer',
    headerName: 'Customer',
    flex: 1,
  },
  {
    field: 'supplier',
    headerName: 'Supplier',
    flex: 1,
  },
  {
    field: 'total',
    headerName: 'Total',
    flex: 1,
  },
];

const Transactions = () => {
  const { data, isLoading } = useQuery(['transaction', 'list'], listQuery, {
    enabled: true,
  });
  const navigate = useNavigate();

  return (
    !isLoading && (
      <div style={{ minWidth: '100%' }}>
        <DataGrid
          rows={data}
          columns={columns}
          hideFooterPagination
          hideFooterRowCount
          hideFooterSelectedRowCount
          onRowClick={params => {
            navigate(`/transactions/${params.id}`);
          }}
        />
      </div>
    )
  );
};

const TransactionService: FC = () => {
  return (
    <Routes>
      <Route path="*" element={<Transactions />} />
      <Route path=":id" element={<Transaction />} />
    </Routes>
  );
};

export default TransactionService;
