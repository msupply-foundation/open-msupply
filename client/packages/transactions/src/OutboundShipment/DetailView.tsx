import React, { FC } from 'react';
import { useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router';
import { request, Transaction } from '@openmsupply-client/common';
import { getMutation, getDetailQuery } from '../api';
import { createDraftStore, useDraftDocument } from '../useDraftDocument';
import { Environment } from '@openmsupply-client/config';

const queryFn = (id: string) => async (): Promise<Transaction> => {
  const result = await request(Environment.API_URL, getDetailQuery(), {
    id,
  });
  const { transaction } = result;
  return transaction;
};

const mutationFn = async (updated: Transaction): Promise<Transaction> => {
  const patch = { transactionPatch: updated };
  const result = await request(Environment.API_URL, getMutation(), patch);
  const { upsertTransaction } = result;
  return upsertTransaction;
};

const placeholderTransaction: Transaction = {
  customer: '',
  total: '',
  date: '',
  supplier: '',
};

const useDraft = createDraftStore<Transaction>();

const useDraftOutbound = (id: string) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { draft, setDraft, save } = useDraftDocument(
    ['transaction', id],
    queryFn(id ?? ''),
    mutationFn,

    // On successfully saving the draft, check if we had just saved a new
    // record - this is indicated by the record having no `id` field.
    // If there was an id field, we would be updating rather than creating.
    // If we did just save a newly created record, replace the current
    // url with the new id of the record. For example, if we are creating
    // an outbound shipment, we would start with the URL:
    // outbound-shipment/new
    // and once saved, we replace the url with the new invoice number
    // outbound-shipment/{invoice_number}
    // This will cause the query key to update, and everything from this
    // point is exactly the same as when editing an existing invoice.
    (data, variables) => {
      if (!variables.id) {
        navigate({ pathname: `../${data.id}` }, { replace: true });
      }

      queryClient.invalidateQueries('transaction');
    },
    useDraft,
    id === 'new' ? placeholderTransaction : undefined
  );

  return { draft, setDraft, save };
};

export const OutboundShipmentDetailView: FC = () => {
  const { id } = useParams();
  const { draft, setDraft, save } = useDraftOutbound(id ?? 'new');

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
        <button onClick={save}>OK</button>
      </div>
    </>
  ) : null;
};
