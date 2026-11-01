import { graphqlFetch } from '../../../../api/graphql';
import { authUser } from '../../../../auth/authContext';
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

/**
 * The encounter types a patient can be given an encounter of: those of the
 * programs they are enrolled in, since the server refuses an encounter in any
 * other program. For the patient screen's New encounter and the encounter
 * screen's prompt to schedule the next visit.
 */
export const encounterTypesFor = (
  registries: readonly FormRegistryFragment[],
  enrolments: readonly { contextId: string }[]
): FormRegistryFragment[] => {
  const contexts = new Set(enrolments.map(e => e.contextId));
  return registries.filter(
    r => r.category === 'ENCOUNTER' && contexts.has(r.contextId)
  );
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
  patientRegistryByUserAndStore.set(rememberKey(storeId), entry);
  return { entry };
};

// The answer each store gave this session, so the next patient opened there
// is read on its path at once rather than after the registry answers again.
// Kept per user as well as store: the entries a user may see follow their
// document permissions, and a logout does not reload the page. Every
// read refreshes it; one that answers differently (a plugin installed
// meanwhile) corrects the patient read that followed the old answer.
const patientRegistryByUserAndStore = new Map<
  string,
  FormRegistryFragment | undefined
>();
const rememberKey = (storeId: string): string =>
  `${authUser()?.userId ?? ''}|${storeId}`;
export const rememberedPatientRegistry = (
  storeId: string
): { entry: FormRegistryFragment | undefined } | undefined => {
  const key = rememberKey(storeId);
  return patientRegistryByUserAndStore.has(key)
    ? { entry: patientRegistryByUserAndStore.get(key) }
    : undefined;
};
