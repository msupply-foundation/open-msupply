// import { SaveDocumentMutation } from '../../../../JsonForms';
import { SaveDocumentMutation } from '../../../../Patient/JsonForms';
import { useInsertEncounter } from './useInsertEncounter';
import { useUpdateEncounter } from './useUpdateEncounter';

export const useUpsertEncounter = (
  patientId: string,
  programType: string,
  type: string
): SaveDocumentMutation => {
  const { mutateAsync: insertEncounter } = useInsertEncounter();
  const { mutateAsync: updateEncounter } = useUpdateEncounter();
  return async (jsonData: unknown, formSchemaId: string, parent?: string) => {
    if (parent === undefined) {
      const result = await insertEncounter({
        data: jsonData,
        schemaId: formSchemaId,
        patientId,
        type,
        programType,
      });
      return result;
    } else {
      const result = await updateEncounter({
        data: jsonData,
        parent,
        schemaId: formSchemaId,
      });
      return result;
    }
  };
};
