import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import type { PatientWriteOutcome } from '../../patientApi';
import {
  InsurancePolicies,
  type InsurancePoliciesVariables,
  InsuranceProviders,
  type InsuranceProvidersVariables,
  type InsurancePolicyFragment,
  InsertInsurance,
  type InsertInsuranceVariables,
  UpdateInsurance,
  type UpdateInsuranceVariables,
} from './insurance.generated';

// Insurance data access (spec/patients § insurance policies; contract ›
// insurance policies / writes). Reads never throw (discriminated result →
// undefined on any non-success); writes follow the patient-write shape — like
// every patient write, insurance writes carry NO typed error, so we opt into
// returnGraphqlErrors only to keep a rejection OFF the global unexpected-error
// modal and surface one generic message inline in the modal instead.

export type InsuranceProviderOption = { id: string; providerName: string };

export const fetchInsurancePolicies = async (
  variables: InsurancePoliciesVariables
): Promise<InsurancePolicyFragment[] | undefined> => {
  const result = await graphqlFetch(InsurancePolicies, variables);
  if (result.kind !== 'success') return undefined;
  return result.data.insurancePolicies.nodes;
};

// The configured providers gate the whole insurance surface — the server
// returns ACTIVE providers only (contract). Returns [] on any non-success so
// the caller treats "couldn't load" as "no insurance surface", never a crash.
export const fetchInsuranceProviders = async (
  storeId: InsuranceProvidersVariables['storeId']
): Promise<InsuranceProviderOption[]> => {
  const result = await graphqlFetch(InsuranceProviders, { storeId });
  if (result.kind !== 'success') return [];
  return result.data.insuranceProviders.nodes;
};

const saveFailed = (): PatientWriteOutcome => ({
  kind: 'error',
  message: t('messages.error-saving-insurances'),
});

// Add a policy. The client sends the two number parts; the server composes the
// full number (contract › insurance writes). A reused id is the only insert
// rejection and is unreachable through the UI (fresh client-minted id).
export const runInsertInsurance = async (
  storeId: string,
  input: InsertInsuranceVariables['input']
): Promise<PatientWriteOutcome | undefined> => {
  const result = await graphqlFetch(
    InsertInsurance,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') return saveFailed();
  if (result.kind !== 'success') return undefined;
  return { kind: 'ok', id: result.data.insertInsurance.id };
};

// Edit a policy — a patch. The policy-number parts and patient link have no
// input field (fixed at creation).
export const runUpdateInsurance = async (
  storeId: string,
  input: UpdateInsuranceVariables['input']
): Promise<PatientWriteOutcome | undefined> => {
  const result = await graphqlFetch(
    UpdateInsurance,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') return saveFailed();
  if (result.kind !== 'success') return undefined;
  return { kind: 'ok', id: result.data.updateInsurance.id };
};
