import { useMutation, SortBy } from '@openmsupply-client/common';
import { PatientRowFragment } from '../../operations.generated';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatientsAll = (sortBy: SortBy<PatientRowFragment>) => {
  const api = usePatientApi();

  return {
    ...useMutation(api.keys.sortedList(sortBy), () =>
      api.get.listAll({ sortBy })
    ),
  };
};
