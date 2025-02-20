import { useQuery } from '@openmsupply-client/common';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { INSURANCE, LIST } from './keys'; // update keys

export const useInsurance = (insuranceId: string, storeId: string) => {
  const { prescriptionApi } = usePrescriptionGraphQL();

  const queryKey = [INSURANCE, LIST, { insuranceId, storeId }];

  const queryFn = async () => {
    const query = await prescriptionApi.insuranceById({
      storeId,
      insuranceId,
    });

    if (query.insurance.__typename === 'InsuranceNode') {
      return query.insurance;
    }
  };

  const { data, isLoading, isError } = useQuery({ queryKey, queryFn });

  return {
    query: { data, isLoading, isError },
  };
};
