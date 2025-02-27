import {
  FnUtils,
  InsurancePolicyNodeType,
  useMutation,
  usePatchState,
  useQuery,
  useUrlQuery,
} from '@openmsupply-client/common';
import { usePatientGraphQL } from '../usePatientGraphQL';
import { INSURANCE_POLICIES } from './keys';
import { InsuranceFragment } from '../operations.generated';

export interface DraftInsurance extends InsuranceFragment {
  nameId: string;
}

const defaultDraftInsurance: DraftInsurance = {
  __typename: 'InsuranceNode',
  policyNumber: '',
  id: '',
  policyNumberFamily: '',
  policyNumberPerson: '',
  insuranceProviderId: '',
  policyType: '' as InsurancePolicyNodeType,
  isActive: true,
  discountPercentage: 0,
  expiryDate: '',
  nameId: '',
};

export const useInsurancePolicies = (id: string) => {
  const { data, isLoading, error } = useGet(id);

  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const {
    mutateAsync: updateMutation,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdate();

  const { patch, updatePatch, resetDraft, isDirty } = usePatchState(data ?? {});

  const { urlQuery } = useUrlQuery();
  const insuranceId = urlQuery['insuranceId'];
  const haveInsuranceId = insuranceId !== undefined;
  const selectedInsurance = data?.nodes.find(({ id }) => id === insuranceId);

  const draft = data
    ? { ...defaultDraftInsurance, ...selectedInsurance, ...patch, nameId: id }
    : { ...defaultDraftInsurance, ...patch, nameId: id };

  const create = async () => {
    const result = await createMutation(draft);
    resetDraft();
    return result;
  };

  const update = async () => {
    const result = await updateMutation(draft);
    resetDraft();
    return result;
  };

  return {
    query: { data: data?.nodes, isLoading, error },
    create: { create, isCreating, createError },
    update: { update, isUpdating, updateError },
    insuranceId,
    haveInsuranceId,
    draft,
    resetDraft,
    isDirty,
    updatePatch,
  };
};

const useGet = (id: string) => {
  const { patientApi, storeId } = usePatientGraphQL();

  const queryFn = async () => {
    const result = await patientApi.insurancePolicies({
      storeId,
      nameId: id,
    });

    if (result.insurancePolicies.__typename === 'InsuranceConnector') {
      return result.insurancePolicies;
    }
  };

  const query = useQuery({ queryKey: [INSURANCE_POLICIES], queryFn });

  return query;
};

const useCreate = () => {
  const { patientApi, storeId, queryClient } = usePatientGraphQL();

  const mutationFn = async ({
    policyNumberFamily,
    policyNumberPerson,
    insuranceProviderId,
    policyType,
    nameId,
    isActive,
    discountPercentage,
    expiryDate,
  }: DraftInsurance) => {
    return await patientApi.insertInsurance({
      storeId,
      input: {
        nameId,
        id: FnUtils.generateUUID(),
        policyNumberFamily: policyNumberFamily ?? '',
        policyNumberPerson: policyNumberPerson ?? '',
        insuranceProviderId,
        policyType,
        isActive,
        discountPercentage,
        expiryDate,
      },
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([INSURANCE_POLICIES]),
  });
};

const useUpdate = () => {
  const { patientApi, storeId, queryClient } = usePatientGraphQL();

  const mutationFn = async ({
    id,
    insuranceProviderId,
    policyType,
    discountPercentage,
    expiryDate,
    isActive,
  }: DraftInsurance) => {
    const result = await patientApi.updateInsurance({
      storeId,
      input: {
        id,
        insuranceProviderId,
        policyType,
        discountPercentage,
        expiryDate,
        isActive,
      },
    });

    if (result.updateInsurance.id !== undefined) {
      return result.updateInsurance;
    }

    throw new Error('Could not update insurance');
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([INSURANCE_POLICIES]),
  });
};
