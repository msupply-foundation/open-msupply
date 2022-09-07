import { usePatientId } from '../utils/usePatientId';
import {
  EncounterSortFieldInput,
  SortRule,
  useQuery,
} from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';
import { EncounterListParams } from '../../api';

export const useEncounters = (sortBy?: SortRule<EncounterSortFieldInput>) => {
  const patientId = usePatientId();
  const filterBy = { patientId: { equalTo: patientId } };

  const api = usePatientApi();
  const params: EncounterListParams = {
    sortBy: {
      key: sortBy?.key ?? EncounterSortFieldInput.StartDatetime,
      isDesc: sortBy?.isDesc,
    },
    filterBy,
  };
  return {
    ...useQuery(api.keys.paramListEncounter(params), () =>
      api.get.listEncounter(params)
    ),
  };
};
