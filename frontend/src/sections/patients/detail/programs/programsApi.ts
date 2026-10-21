import { graphqlFetch } from '../../../../api/graphql';
import {
  PatientProgramEnrolments,
  type PatientProgramEnrolmentsVariables,
  type ProgramEnrolmentRowFragment,
  PatientEncounters,
  type PatientEncountersVariables,
  type EncounterRowFragment,
} from './programTabs.generated';
import {
  FormRegistries,
  type FormRegistryFragment,
} from '../../../../domain/documentForm/documentForm.generated';

// Read access for the patient detail's program-module tabs (spec/patients §
// program-module tabs): the tables' rows and the registry entries behind the
// create actions. Never-throwing: any non-success result maps to undefined
// (the caller shows the table's own empty/loading state), never a crash.

export const fetchPatientProgramEnrolments = async (
  variables: PatientProgramEnrolmentsVariables
): Promise<ProgramEnrolmentRowFragment[] | undefined> => {
  const result = await graphqlFetch(PatientProgramEnrolments, variables);
  if (result.kind !== 'success') return undefined;
  return result.data.programEnrolments.nodes;
};

export const fetchPatientEncounters = async (
  variables: PatientEncountersVariables
): Promise<EncounterRowFragment[] | undefined> => {
  const result = await graphqlFetch(PatientEncounters, variables);
  if (result.kind !== 'success') return undefined;
  return result.data.encounters.nodes;
};

// The enrolment and encounter types the create actions offer: the store's
// registry entries in the two categories, already narrowed by the server to
// the programs the user holds a document permission for.
export const fetchFormRegistries = async (
  storeId: string
): Promise<FormRegistryFragment[] | undefined> => {
  const result = await graphqlFetch(FormRegistries, {
    storeId,
    filter: { category: { equalAny: ['PROGRAM_ENROLMENT', 'ENCOUNTER'] } },
  });
  if (result.kind !== 'success') return undefined;
  return result.data.documentRegistries.nodes;
};

// The store's Patient registry entry, which puts the patient's Details tab on
// the document path (spec/patients rules › two persistence paths): `entry` is
// undefined when there is none. Undefined itself while unanswered or failed.
export const fetchPatientRegistry = async (
  storeId: string
): Promise<{ entry: FormRegistryFragment | undefined } | undefined> => {
  const result = await graphqlFetch(FormRegistries, {
    storeId,
    filter: { category: { equalTo: 'PATIENT' } },
  });
  if (result.kind !== 'success') return undefined;
  const entry = result.data.documentRegistries.nodes[0];
  patientRegistryByStore.set(storeId, entry);
  return { entry };
};

// The answer each store gave this session, so the next patient opened there
// is read on its path at once rather than after the registry answers again
// (#1562). Every read refreshes it; one that answers differently (a plugin
// installed meanwhile) corrects the patient read that followed the old answer.
const patientRegistryByStore = new Map<
  string,
  FormRegistryFragment | undefined
>();
export const rememberedPatientRegistry = (
  storeId: string
): { entry: FormRegistryFragment | undefined } | undefined =>
  patientRegistryByStore.has(storeId)
    ? { entry: patientRegistryByStore.get(storeId) }
    : undefined;
