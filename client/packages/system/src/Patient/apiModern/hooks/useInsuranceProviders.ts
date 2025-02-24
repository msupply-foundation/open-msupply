import { useQuery } from '@openmsupply-client/common';
import { usePatientGraphQL } from '../usePatientGraphQL';
import { INSURANCE_PROVIDERS } from './keys';

export const useInsuranceProviders = () => {
  const { patientApi, storeId } = usePatientGraphQL();

  const queryFn = async () => {
    const result = await patientApi.insuranceProviders({ storeId });

    if (
      result.insuranceProviders.__typename === 'InsuranceProvidersConnector'
    ) {
      return result.insuranceProviders;
    }
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: [INSURANCE_PROVIDERS],
    queryFn,
  });

  return {
    query: { data: data?.nodes ?? [], isLoading, isError },
  };
};
