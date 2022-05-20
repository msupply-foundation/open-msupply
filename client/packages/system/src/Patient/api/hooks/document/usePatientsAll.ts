import { useMutation, SortBy } from '@openmsupply-client/common';
import { NameRowFragment } from '../../operations.generated';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatientsAll = (sortBy: SortBy<NameRowFragment>) => {
  const api = usePatientApi();

  return {
    ...useMutation(api.keys.sortedList(sortBy), () =>
      api.get.listAll({ sortBy })
    ),
  };
};
