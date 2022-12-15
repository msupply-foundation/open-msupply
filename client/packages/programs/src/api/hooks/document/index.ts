import { useDocumentByName } from './useDocumentByName';
import { usePatientDocument } from './usePatientDocument';
import { useDocumentRegistryByContext } from './useDocumentRegistryByContext';
import { useAllocateNumber } from './useAllocateNumber';
import { useEncounterFields } from './useEncounterFields';
import { useEncounterById } from './useEncounterById';
import { useEncounterPrevious } from './useEncounterPrevious';

export const Document = {
  useDocumentByName,
  usePatientDocument,
  useDocumentRegistryByContext,
  useAllocateNumber,
  useEncounterById,
  useEncounterFields,
  useEncounterPrevious,
};
