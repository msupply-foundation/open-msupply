import { useEffect, useReducer, Dispatch, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import {
  DefaultDraftAction,
  ReducerCreator,
  Api,
  DraftState,
  DraftActionType,
  DraftActionSet,
} from './types';

export const initDraft = (): DefaultDraftAction => ({
  type: DraftActionType.Init,
});

export const mergeDraft = (): DefaultDraftAction => ({
  type: DraftActionType.Merge,
});

export const useDraftDocument = <
  DraftType extends { id: string },
  ReadType extends { id: string },
  StateType extends { draft: DraftType },
  ActionType
>(
  queryKey: unknown[],
  reducer: ReducerCreator<ReadType, StateType, DraftActionSet<ActionType>>,
  api: Api<ReadType, DraftType>
): DraftState<DraftType, StateType, ReadType, ActionType> => {
  const isNew = queryKey.includes('new');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery(queryKey, api.onRead, { enabled: !isNew });

  const { mutateAsync } = useMutation(api.onUpdate, {
    onSuccess: (data, variables) => {
      if (variables.id) {
        navigate({ pathname: `../${data.id}` }, { replace: true });
      }

      queryClient.invalidateQueries(queryKey);
    },
  });

  const dispatchRef = useRef<Dispatch<DraftActionSet<ActionType>> | null>(null);

  const [state, dispatch] = useReducer(
    reducer(data, dispatchRef.current),
    undefined,
    () => reducer(data, dispatchRef.current)(undefined, initDraft())
  );

  dispatchRef.current = dispatch;

  useEffect(() => {
    if (data) {
      dispatch({ type: DraftActionType.Merge });
    }
  }, [data]);

  const { draft } = state;

  return { state, draft, save: mutateAsync, dispatch };
};
