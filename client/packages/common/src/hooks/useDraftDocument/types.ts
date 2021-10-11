import { Dispatch } from 'react';
export interface Api<ReadType, UpdateType> {
  onRead: () => Promise<ReadType>;
  onUpdate: (val: UpdateType) => Promise<ReadType>;
}

export type ReducerCreator<ServerDataType, StateType, ActionType> = (
  data: ServerDataType | undefined,
  dispatch: Dispatch<DraftActionSet<ActionType>> | null
) => (state: StateType | undefined, action: ActionType) => StateType;

export interface DraftState<DraftType, StateType, ReadType, ActionType> {
  draft: DraftType;
  state: StateType;
  dispatch: Dispatch<DraftActionSet<ActionType>>;
  save: (draft: DraftType) => Promise<ReadType>;
}

export enum DraftActionType {
  Init = 'Draft/init',
  Merge = 'Draft/merge',
}

export type DefaultDraftAction =
  | { type: DraftActionType.Init }
  | { type: DraftActionType.Merge };

export type DraftActionSet<T> = T | DefaultDraftAction;
