import { useEffect, useReducer, Dispatch, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@openmsupply-client/common';

interface Api<ReadType, UpdateType> {
  onRead: () => Promise<ReadType>;
  onUpdate: (val: UpdateType) => Promise<ReadType>;
}

type ReducerCreator<ServerDataType, StateType, ActionType> = (
  data: ServerDataType | undefined,
  save: Dispatch<ActionType> | null
) => (state: StateType | undefined, action: ActionType) => StateType;

interface DraftState<StateType, ReadType> {
  draft: StateType;
  save: (draft: StateType) => Promise<ReadType>;
}

export type DraftReducerActionCreators =
  | { type: 'draft/init' }
  | { type: 'draft/merge' };

export const useDraft = <
  ReadType extends { id: string },
  StateType extends { id: string },
  ActionType extends { type: string } | DraftReducerActionCreators
>(
  queryKey: unknown[],
  reducer: ReducerCreator<ReadType, StateType, ActionType>,
  api: Api<ReadType, StateType>
): DraftState<StateType, ReadType> => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = queryKey.includes('new');

  const { data } = useQuery(queryKey, api.onRead, {
    enabled: !isNew,
  });

  const { mutateAsync } = useMutation(api.onUpdate, {
    onSuccess: (data, variables) => {
      if (variables.id) {
        navigate({ pathname: `../${data.id}` }, { replace: true });
      }

      queryClient.invalidateQueries('transaction');
    },
  });

  const dispatchRef = useRef<Dispatch<ActionType> | null>(null);
  const [state, dispatch] = useReducer(
    reducer(data, dispatchRef.current),
    null,
    () =>
      reducer(data, dispatchRef.current)(undefined, {
        type: 'draft/init',
      } as ActionType)
  );

  dispatchRef.current = dispatch;

  useEffect(() => {
    if (data) {
      dispatch({ type: 'draft/merge' } as ActionType);
    }
  }, [data]);

  return { draft: state, save: mutateAsync };
};
