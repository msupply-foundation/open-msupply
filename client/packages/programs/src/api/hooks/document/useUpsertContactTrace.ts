import { SaveDocumentMutation } from '../../../JsonForms';
import { useContactTraces } from '..';
import { ContactTraceFragment } from '../../operations.generated';

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
): SaveDocumentMutation => {
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
    return result.document;
  };
};
