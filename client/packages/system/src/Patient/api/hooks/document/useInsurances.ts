import { useQuery } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';
import { InsuranceListParams } from '../../api';

export const useInsurances = ({ nameId, sortBy }: InsuranceListParams) => {
  const api = usePatientApi();
  return useQuery(api.keys.insurances({ nameId, sortBy }), () =>
    api.insurances({ nameId, sortBy })
  );
};
