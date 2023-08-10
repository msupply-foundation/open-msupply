import { SaveDocumentMutation } from 'packages/programs/src/JsonForms';
import { useContactTraces } from '..';
import { ContactTraceFragment } from '../../operations.generated';

export type UpsertContactTraceMutation = (
  jsonData: unknown,
  formSchemaId: string,
  parent?: string
) => Promise<ContactTraceFragment>;

export const useUpsertContactTrace = (
  patientId: string,
  type: string
): UpsertContactTraceMutation => {
  const { mutateAsync: insert } = useContactTraces.document.insert();
  const { mutateAsync: update } = useContactTraces.document.update();

  return async (jsonData: unknown, formSchemaId: string, parent?: string) =>
    parent === undefined
      ? await insert({
          data: jsonData,
          schemaId: formSchemaId,
          patientId,
          type,
        })
      : update({
          data: jsonData,
          parent,
          schemaId: formSchemaId,
          patientId,
          type,
        });
};

export const useUpsertContactTraceDocument = (
  patientId: string,
  type: string
): SaveDocumentMutation => {
  const upsert = useUpsertContactTrace(patientId, type);
  return async (jsonData: unknown, formSchemaId: string, parent?: string) => {
    const result = await upsert(jsonData, formSchemaId, parent);
    return result.document;
  };
};
