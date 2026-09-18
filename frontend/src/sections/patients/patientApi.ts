import { graphqlFetch } from '../../api/graphql';
import { t } from '../../intl';
import {
  InsertPatient,
  type InsertPatientVariables,
} from './list/insertPatient.generated';
import {
  UpdatePatient,
  type UpdatePatientVariables,
  UpdatePatientCustomFields,
  type UpdatePatientCustomFieldsVariables,
} from './detail/updatePatient.generated';

// The ONE place patient writes run (spec/patients § where validation runs;
// ui-surface S6; contract › overarching wire trap).
//
// Every patient write returns a SINGLE-MEMBER union whose only member is
// PatientNode — there is NO typed error node to branch on. Every rejection is a
// top-level GraphQL error (PatientExists / NotAPatient / InvalidDataSchema /
// UnknownCustomFieldKey / …) carried on extensions.details, which the app does
// NOT individually decode: it is built to PREVENT these (client-minted
// identifier, required-field validation, permission gating) and surfaces only
// the generic "Failed to save patient". We opt into returnGraphqlErrors purely
// to keep that failure OFF the global unexpected-error modal so the initiating
// surface can show the generic message inline (registry forbids a toast for an
// action outcome — see the implementation flags). The one decoded patient error
// — central-unreachable — lives in domain/patient, not here.

// ok → proceed (id of the written patient). error → show the generic message on
// the initiating surface, keep it open + input preserved. undefined = handled
// globally (transport / unauthenticated / unexpected).
export type PatientWriteOutcome =
  { kind: 'ok'; id: string } | { kind: 'error'; message: string };

const saveFailed = (): PatientWriteOutcome => ({
  kind: 'error',
  message: t('error.failed-to-save-patient'),
});

// Plain-path create (spec/patients AC-C3/C6). The client mints a fresh id, so a
// PatientExists rejection is not reachable through the UI (AC-C5).
export const runInsertPatient = async (
  storeId: string,
  input: InsertPatientVariables['input']
): Promise<PatientWriteOutcome | undefined> => {
  const result = await graphqlFetch(
    InsertPatient,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') return saveFailed();
  if (result.kind !== 'success') return undefined;
  return { kind: 'ok', id: result.data.insertPatient.id };
};

// Plain-path edit (spec/patients AC-E2). updatePatient is a destructive full
// replace — the caller (patientEdit.ts) MUST build the FULL field set.
export const runUpdatePatient = async (
  storeId: string,
  input: UpdatePatientVariables['input']
): Promise<PatientWriteOutcome | undefined> => {
  const result = await graphqlFetch(
    UpdatePatient,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') return saveFailed();
  if (result.kind !== 'success') return undefined;
  return { kind: 'ok', id: result.data.updatePatient.id };
};

// Custom-fields merge write (spec/patients AC-CF1–CF3). A key set to null
// deletes it; unknown/hidden keys are rejected (surfaced generically).
export const runUpdatePatientCustomFields = async (
  storeId: string,
  input: UpdatePatientCustomFieldsVariables['input']
): Promise<PatientWriteOutcome | undefined> => {
  const result = await graphqlFetch(
    UpdatePatientCustomFields,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') return saveFailed();
  if (result.kind !== 'success') return undefined;
  return { kind: 'ok', id: result.data.updatePatientCustomFields.id };
};
