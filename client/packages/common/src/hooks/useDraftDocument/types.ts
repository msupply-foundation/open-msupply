import { Dispatch } from 'react';

export interface Api<ReadType, UpdateType> {
  onRead: () => Promise<ReadType>;
  onUpdate: (val: UpdateType) => Promise<ReadType>;
}

export type ReducerCreator<ServerDataType, StateType, ActionType> = (
  data: ServerDataType | undefined,
  save: Dispatch<DraftActionSet<ActionType>> | null
) => (state: StateType | undefined, action: ActionType) => StateType;

export interface DraftState<StateType, ReadType> {
  draft: StateType;
  save: (draft: StateType) => Promise<ReadType>;
}

export enum DraftActionType {
  Init = 'Draft/init',
  Merge = 'Draft/merge',
}

export type DefaultDraftAction =
  | { type: DraftActionType.Init }
  | { type: DraftActionType.Merge };

export type DraftActionSet<T> = T | DefaultDraftAction;
