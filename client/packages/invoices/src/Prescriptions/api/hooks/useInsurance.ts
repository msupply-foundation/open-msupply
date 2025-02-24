import { useQuery } from '@openmsupply-client/common';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { INSURANCE, LIST } from './keys';

export const useInsurance = (
  insuranceId: string | undefined | null,
  storeId: string
) => {
  const { prescriptionApi } = usePrescriptionGraphQL();

  const queryKey = [INSURANCE, LIST, { insuranceId, storeId }];

  const queryFn = async () => {
    const query = await prescriptionApi.insuranceById({
      storeId,
      insuranceId: insuranceId ?? '',
    });
    return query.insurance;
  };

  // TODO remove the statement below's use of the enabled attribute by refactoring prescriptions' detail view.
  // See issue 6624: https://github.com/msupply-foundation/open-msupply/issues/6624
  const { data, isLoading, isError } = useQuery(queryKey, queryFn, {
    enabled: !!insuranceId,
  });

  return {
    query: { data, isLoading, isError },
  };
};
