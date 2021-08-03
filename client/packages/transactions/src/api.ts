import { useState, useEffect } from 'react';
import { gql } from 'graphql-request';

import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
} from '@openmsupply-client/common';

export const getQuery = (): string => gql`
  query transaction($id: String!) {
    transaction(id: $id) {
      id
      date
      customer
      supplier
      total
    }
  }
`;

export const mutation = gql`
  mutation Mutation($transactionPatch: TransactionPatch) {
    updateTransaction(transaction: $transactionPatch) {
      id
      date
      customer
      supplier
      total
    }
  }
`;

interface DraftDocumentState<DocumentType> {
  draft: DocumentType | undefined;
  setDraft: (updatedDocument: DocumentType) => void;
  save: () => void;
}

/**
 * Hook to manage the client and server state relationship of a document we are editing.
 * The "draft" is currently auto updated from whatever the server sends. The draft is then
 * edited and saved 'at some point' in the future. When saving, the query is invalidated
 * and the data is refetched from the server so that the server cache is refreshed and
 * kept in sync.
 *
 * Improvements/TODO
 *
 * - Merge/conflict resolution functionality for when data is received from the server. You
 * could set some state that was "There are differences between your version and the latest
 * server version, please revise".
 *
 * - Auto-save: Could do a timer, or a debounced/throttled mutation on the `setDraft` function.
 *
 * - Rollbacks and warnings when saving doesn't succeed.
 *
 * - Optimistically update the server side data so mutation returns/re-querying doesn't cause
 * a re-render if they are still equal.
 *
 * - More parameters/return values - be able to pass through configs for useQuery etc and return the
 * loading/error states.
 *
 * - Easier editing mechanism. I don't want to have to use `setDraft({...draft, [myField]: newValue})
 * every time - especially if there is more complexity - i.e. a customer requisition editing days of
 * stock which might effect many columns. Possibly the draft could be a more complex class instance or
 * we use a more functional approach and have functions i.e. updateDaysOfStock(draft, newValue)
 *
 * - Might be nice/easy/better/worse? to be able to more globally access the current draft. For example,
 * the draft hook will be used at the 'root' of some page, and will be required to be drilled down through
 * components which want to know the current draft values. It's not too difficult to make the value 'global'
 * i.e. can use context, or a simple state management tool like Jotai or Recoil or..
 * - Just use redux :thinking: :shrug: :lol:
 */

export const useDraftDocument = <DocumentType>(
  key: QueryKey,
  queryFn: () => Promise<DocumentType>,
  mutateFn: (updatedDocument: DocumentType) => Promise<DocumentType>
): DraftDocumentState<DocumentType> => {
  const [draft, setDraft] = useState<DocumentType | undefined>();
  const queryClient = useQueryClient();

  const { data } = useQuery(key, queryFn);

  const { mutateAsync } = useMutation(mutateFn, {
    // TODO: onError to rollback
    onSuccess: () => {
      queryClient.invalidateQueries('transaction');
    },
  });

  useEffect(() => {
    // TODO: This could overwrite some existing data. React query will already
    // do a diff on the existing `data`, so when a refetch occurs, i.e. when the window
    // is refocused, the data we are caching will be diffed with the refetched server data,
    // and if there's no difference, it won't change. However if it *did* change, then it would
    // be completely overwritten. We'd likely need a more complex data structure to be able to compare
    // new changes from the server and current draft changes to merge them together and/or show the
    // user the changes and let them resolve it.
    setDraft(data);
  }, [data]);

  const save = () => {
    if (draft) {
      mutateAsync(draft);
    }
  };

  // TODO: Wrap `setDraft` in auto-save functionality? Throttled, debounced? Timer? Optional?
  return { draft, setDraft, save };
};
