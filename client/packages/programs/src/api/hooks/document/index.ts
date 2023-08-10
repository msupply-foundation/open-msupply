import { useDocumentByName } from './useDocumentByName';
import { useDocumentHistory } from './useDocumentHistory';

import { useProgramRegistries } from './useProgramRegistries';
import { useEncounterRegistriesByPrograms } from './useEncounterRegistriesByPrograms';

import { usePatientDocument } from './usePatientDocument';
import { useAllocateNumber } from './useAllocateNumber';

import { useEncounterFields } from './useEncounterFields';
import { useEncounterById, useEncounterByIdPromise } from './useEncounterById';
import { useEncounterPrevious } from './useEncounterPrevious';

import {
  useProgramEnrolments,
  useProgramEnrolmentsPromise,
} from './useProgramEnrolments';
import { useInsertProgramEnrolment } from './useInsertProgramEnrolment';
import { useUpdateProgramEnrolment } from './useUpdateProgramEnrolment';

import { useEncounters } from './useEncounters';
import {
  useUpsertEncounter,
  useUpsertEncounterDocument,
} from './useUpsertEncounter';

import { useClinicians } from './useClinicians';
import { useProgramEvents } from './useProgramEvents';
import { useFormSchemaByType } from './useFormSchemaByType';
import { useDocumentRegistries } from './useDocumentRegistries';
import { useEncounterByDocName } from './useEncounterByDocName';
import { useProgramEnrolmentByDocName } from './useProgramEnrolmentByDocName';
import { useContactTraces } from './useContactTraces';
import { useInsertContactTrace } from './useInsertContactTrace';
import { useUpdateContactTrace } from './useUpdateContactTrace';
import {
  useUpsertContactTrace,
  useUpsertContactTraceDocument,
} from './useUpsertContactTrace';

export const Document = {
  useDocumentByName,
  usePatientDocument,
  useDocumentHistory,

  useDocumentRegistries,
  useProgramRegistries,
  useEncounterRegistriesByPrograms,

  useAllocateNumber,

  useProgramEnrolments,
  useProgramEnrolmentsPromise,
  useProgramEnrolmentByDocName,
  useInsertProgramEnrolment,
  useUpdateProgramEnrolment,

  useEncounters,
  useEncounterById,
  useEncounterByIdPromise,
  useEncounterByDocName,
  useEncounterFields,
  useEncounterPrevious,
  useUpsertEncounter,
  useUpsertEncounterDocument,

  useClinicians,

  useFormSchemaByType,
  useProgramEvents,

  useContactTraces,
  useInsertContactTrace,
  useUpdateContactTrace,
  useUpsertContactTrace,
  useUpsertContactTraceDocument,
};
