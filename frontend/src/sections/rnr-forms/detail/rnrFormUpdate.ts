import { graphqlFetch } from '@/api/graphql';
import {
  FinaliseRnrForm,
  UpdateRnrForm,
  type RnrFormDetailResult,
  type UpdateRnrFormVariables,
} from './rnrFormDetail.generated';
import {
  linesToSave,
  toUpdateLineInput,
  type DraftRnrLine,
} from './rnrFormEdit';

// Order-level mutation wrappers returning discriminated domain results
// (kdd/state-management). Every R&R mutation rejection is a NON-typed
// top-level error (contract § wire trap) — the modal-worthy ones are
// pre-empted client-side, so anything reaching the server here falls through
// to the global error surface and the caller just releases its busy state.

export type RnrFormNode = Extract<
  RnrFormDetailResult['rAndRForm'],
  { __typename: 'RnRFormNode' }
>;

export type SaveResult =
  | { kind: 'saved'; node: RnrFormNode; savedLineIds: string[] }
  | { kind: 'failed' };

type HeaderPatch = Pick<
  UpdateRnrFormVariables['input'],
  'theirReference' | 'comment'
>;

/** One save call: the header patch (if any) + the dirty, valid lines
 * (rules § editing a draft — error lines are withheld). */
export const saveRnrForm = async (
  storeId: string,
  formId: string,
  lines: DraftRnrLine[],
  header: HeaderPatch = {}
): Promise<SaveResult> => {
  const toSave = linesToSave(lines);
  const result = await graphqlFetch(UpdateRnrForm, {
    storeId,
    input: {
      id: formId,
      lines: toSave.map(toUpdateLineInput),
      ...header,
    },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  return {
    kind: 'saved',
    node: result.data.updateRnrForm,
    savedLineIds: toSave.map(line => line.id),
  };
};

export type FinaliseResult =
  { kind: 'finalised'; node: RnrFormNode } | { kind: 'failed' };

export const finaliseRnrForm = async (
  storeId: string,
  formId: string
): Promise<FinaliseResult> => {
  const result = await graphqlFetch(FinaliseRnrForm, {
    storeId,
    input: { id: formId },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  return { kind: 'finalised', node: result.data.finaliseRnrForm };
};
