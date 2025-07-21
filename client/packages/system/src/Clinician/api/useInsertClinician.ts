import {
  FnUtils,
  isEmpty,
  useMutation,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftClinician } from '..';
import { useCliniciansGraphQL } from './useCliniciansGraphQL';
import { CLINICIAN } from './keys';

export const useInsertClinician = () => {
  const t = useTranslation();
  const { api, storeId, queryClient } = useCliniciansGraphQL();

  const mutationFn = async (input: DraftClinician) => {
    const apiResult = await api.insertClinician({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        ...input,
      },
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      return apiResult.insertClinician;
    }

    throw new Error(t('error.something-wrong'));
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries(CLINICIAN);
    },
  });
};
