import { SaveDocumentMutation } from '@openmsupply-client/programs';
import { EncounterFragment } from '../../operations.generated';
import { useInsertEncounter } from './useInsertEncounter';
import { useUpdateEncounter } from './useUpdateEncounter';

export type UpsertEncounterMutation = (
  jsonData: unknown,
  formSchemaId: string,
  parent?: string
) => Promise<EncounterFragment>;

export const useUpsertEncounter = (
  patientId: string,
  type: string
): UpsertEncounterMutation => {
  const { mutateAsync: insertEncounter } = useInsertEncounter();
  const { mutateAsync: updateEncounter } = useUpdateEncounter();
  return async (jsonData: unknown, formSchemaId: string, parent?: string) => {
    if (parent === undefined) {
      const result = await insertEncounter({
        data: jsonData,
        schemaId: formSchemaId,
        patientId,
        type,
      });
      return result;
    } else {
      const result = await updateEncounter({
        data: jsonData,
        parent,
        schemaId: formSchemaId,
        type,
      });
      return result;
    }
  };
};

export const useUpsertEncounterDocument = (
  patientId: string,
  type: string
): SaveDocumentMutation => {
  const upsert = useUpsertEncounter(patientId, type);
  return async (jsonData: unknown, formSchemaId: string, parent?: string) => {
    const result = await upsert(jsonData, formSchemaId, parent);
    return result.document;
  };
};
