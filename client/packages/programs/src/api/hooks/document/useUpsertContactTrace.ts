import { SaveDocumentMutation } from 'packages/programs/src/JsonForms';
import { useContactTraces } from '..';
import { ContactTraceFragment } from '../../operations.generated';

export type UpsertContactTraceMutation = (
  jsonData: unknown,
  formSchemaId: string,
  parent?: string
) => Promise<ContactTraceFragment>;

/**
 * Upserts a contact trace.
 *
 * @param onUpsert if provided this callback will be called whenever a contact trace has been
 * updated
 */
export const useUpsertContactTrace = (
  patientId: string,
  type: string,
  onUpsert?: (trace: ContactTraceFragment) => void
): UpsertContactTraceMutation => {
  const { mutateAsync: insert } = useContactTraces.document.insert();
  const { mutateAsync: update } = useContactTraces.document.update();

  return async (jsonData: unknown, formSchemaId: string, parent?: string) => {
    let result;
    if (parent === undefined) {
      result = await insert({
        data: jsonData,
        schemaId: formSchemaId,
        patientId,
        type,
      });
    } else {
      result = await update({
        data: jsonData,
        parent,
        schemaId: formSchemaId,
        patientId,
        type,
      });
    }
    if (onUpsert) {
      onUpsert(result);
    }
    return result;
  };
};

export const useUpsertContactTraceDocument = (
  patientId: string,
  type: string,
  onUpsert?: (trace: ContactTraceFragment) => void
): SaveDocumentMutation => {
  const upsert = useUpsertContactTrace(patientId, type, onUpsert);
  return async (jsonData: unknown, formSchemaId: string, parent?: string) => {
    const result = await upsert(jsonData, formSchemaId, parent);
    return result.document;
  };
};
