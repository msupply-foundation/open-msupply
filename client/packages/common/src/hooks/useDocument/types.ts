import { Dispatch } from 'react';

export interface Api<ServerData, Document> {
  onRead: () => Promise<ServerData>;
  onUpdate: (val: Document) => Promise<ServerData>;
}

export type ReducerCreator<ServerData, State, ActionSet> = (
  data: ServerData | undefined,
  dispatch: Dispatch<DocumentActionSet<ActionSet>> | null
) => (state: State | undefined, action: ActionSet) => State;

export interface DocumentState<Document, State, ServerData, ActionSet> {
  draft: Document;
  state: State;
  dispatch: Dispatch<DocumentActionSet<ActionSet>>;
  save: (draft: Document) => Promise<ServerData>;
}

export enum DocumentActionType {
  Init = 'Draft/init',
  Merge = 'Draft/merge',
}

export type DefaultDocumentAction =
  | { type: DocumentActionType.Init }
  | { type: DocumentActionType.Merge };

export type DocumentActionSet<T> = T | DefaultDocumentAction;
