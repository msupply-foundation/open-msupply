import { graphqlFetch } from '../../api/graphql';
import { t } from '../../intl';
import {
  InsertClinician,
  type InsertClinicianVariables,
} from './insertClinician.generated';

// The ONE place a clinician write runs (spec/prescriptions contract › patient,
// clinician, program, diagnosis). Creation is the only write the schema offers:
// there is no clinician update or delete.
//
// `insertClinician` returns a bare `IdResponse` — there is NO typed error node
// to branch on. Every rejection is a top-level GraphQL error
// (CodeCannotBeEmpty / InitialsCannotBeEmpty / LastNameCannotBeEmpty /
// ClinicianAlreadyExists / InvalidStore as BadUserInput), and the client is
// built to PREVENT each reachable one — required-field validation, a
// client-minted id, and the affordance's permission gate — so none is decoded
// individually. We opt into returnGraphqlErrors purely to keep the failure OFF
// the global unexpected-error modal, so the form can show the generic message
// inline and keep the draft (registry forbids a toast for an action outcome).

// ok → proceed (the new clinician's id). error → show the message in the form,
// keep it open with the draft intact. undefined = handled globally (transport /
// unauthenticated / unexpected).
export type ClinicianWriteOutcome =
  { kind: 'ok'; id: string } | { kind: 'error'; message: string };

export const runInsertClinician = async (
  storeId: string,
  input: InsertClinicianVariables['input']
): Promise<ClinicianWriteOutcome | undefined> => {
  const result = await graphqlFetch(
    InsertClinician,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError')
    return { kind: 'error', message: t('error.failed-to-save-clinician') };
  if (result.kind !== 'success') return undefined;
  return { kind: 'ok', id: result.data.insertClinician.id };
};
