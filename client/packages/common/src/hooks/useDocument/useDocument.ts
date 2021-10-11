import { useEffect, useReducer, Dispatch, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import {
  DefaultDocumentAction,
  ReducerCreator,
  Api,
  DocumentState,
  DocumentActionType,
  DocumentActionSet,
} from './types';
import { DomainObject } from '../../types';

export const DocumentAction = {
  init: (): DefaultDocumentAction => ({
    type: DocumentActionType.Init,
  }),
  merge: (): DefaultDocumentAction => ({
    type: DocumentActionType.Merge,
  }),
};

/**
 * Hook which handles side effects for fetching and updating server data and aids in merging
 * the server data with a client side copy.
 *
 * The intention is that you are able to pass a reducer function creator and API interface
 * and the heavy lifting of managing your client side state should be simplified.
 *
 * When data is fetched from the server, a DocumentAction.merge action is dispatched.
 *
 *
 */

export const useDocument = <
  State extends { draft: Document },
  Document extends DomainObject,
  ServerData extends DomainObject,
  ActionSet
>(
  queryKey: unknown[],
  reducer: ReducerCreator<ServerData, State, DocumentActionSet<ActionSet>>,
  api: Api<ServerData, Document>
): DocumentState<Document, State, ServerData, DocumentActionSet<ActionSet>> => {
  // A query key which contains new, means it has not been created on the server yet.
  // TODO: Far more robust method needed here.
  const isNew = queryKey.includes('new');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Data is the current data on the server and our most up to date snapshot of the server state.
  // We're keeping it around, separate from our client state as to reference when needed and period
  // background re-fetches to keep an upto date reference to the server state.
  const { data } = useQuery(queryKey, api.onRead, { enabled: !isNew });

  // Mutation to sync our client state with the server state. The onUpdate function should take the full
  // document state and manage the communication with the server from that.
  const { mutateAsync } = useMutation(api.onUpdate, {
    // TODO: onError: should dispatch some DefaultDocumentAction with errors for the reducer to handle.
    onSuccess: (data, variables) => {
      if (variables.id) {
        navigate({ pathname: `../${data.id}` }, { replace: true });
      }

      queryClient.invalidateQueries(queryKey);
    },
  });

  const dispatchRef = useRef<Dispatch<DocumentActionSet<ActionSet>> | null>(
    null
  );

  const [state, dispatch] = useReducer(
    reducer(data, dispatchRef.current),
    undefined,
    () => reducer(data, dispatchRef.current)(undefined, DocumentAction.init())
  );

  dispatchRef.current = dispatch;

  useEffect(() => {
    if (data) {
      dispatch(DocumentAction.merge());
    }
  }, [data]);

  const { draft } = state;

  return { state, draft, save: mutateAsync, dispatch };
};
