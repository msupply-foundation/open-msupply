import React, { FC } from 'react';
import { request } from 'graphql-request';
import { query, mutation, useDraftDocument } from './api';

interface Transaction {
  customer: string;
  supplier: string;
  total: string;
  id: string;
  date: string;
}

const queryFn = async (): Promise<Transaction> => {
  const result = await request('http://localhost:4000', query);
  const { transaction } = result;

  return transaction;
};

const mutationFn = async (updated: Transaction): Promise<Transaction> => {
  const patch = { transactionPatch: updated };
  const result = await request('http://localhost:4000', mutation, patch);

  const { updateTransaction } = result;

  return updateTransaction;
};

const TransactionService: FC = () => {
  const { draft, setDraft, save } = useDraftDocument<Transaction>(
    'key',
    queryFn,
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

export default TransactionService;
