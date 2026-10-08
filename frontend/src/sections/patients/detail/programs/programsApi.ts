import { graphqlFetch } from '../../../../api/graphql';
import {
  PatientProgramEnrolments,
  type PatientProgramEnrolmentsVariables,
  type ProgramEnrolmentRowFragment,
  PatientEncounters,
  type PatientEncountersVariables,
  type EncounterRowFragment,
} from './programTabs.generated';

// Read access for the patient detail's program-module tabs (spec/patients §
// program-module tabs). Read-only — these feed plain tables; the enrolment /
// encounter editors and the vaccination card are owned by other verticals.
// Never-throwing: any non-success result maps to undefined (the caller shows
// the table's own empty/loading state), never a crash.

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
