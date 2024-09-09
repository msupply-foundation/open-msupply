import { useState } from 'react';
import {
  FnUtils,
  Formatter,
  isEmpty,
  useMutation,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common';

import { Clinician } from '../../Clinician';
import { useVaccinationsGraphQL } from './useVaccinationsGraphQL';
import { VACCINATION } from './keys';

export interface VaccinationDraft {
  clinician?: Clinician | null;
  date: Date | null;
  given?: boolean;
  comment?: string;
  itemId?: string;
  stockLineId?: string;
  notGivenReason?: string;
}

export function useVaccination({
  vaccineCourseDoseId,
  vaccinationId,
  encounterId,
  defaultClinician,
}: {
  vaccineCourseDoseId: string;
  encounterId: string;
  vaccinationId: string | undefined;
  defaultClinician?: Clinician;
}) {
  const { api } = useVaccinationsGraphQL();

  const { data, isLoading } = useQuery({
    queryKey: [VACCINATION, vaccineCourseDoseId, vaccinationId],
    queryFn: async () => {
      const result = await api.vaccineCourseDose({ id: vaccineCourseDoseId });

      if (result.vaccineCourseDose.__typename === 'VaccineCourseDoseNode') {
        return result.vaccineCourseDose;
      }
    },
  });

  const { mutateAsync: insert } = useInsert({
    encounterId,
    vaccineCourseDoseId,
  });

  const [patch, setPatch] = useState<Partial<VaccinationDraft>>({});

  const defaults: VaccinationDraft = {
    date: new Date(),
    clinician: defaultClinician,
  };

  const draft: VaccinationDraft = { ...defaults, ...data, ...patch };

  const isComplete =
    (draft.given && !!draft.itemId && !!draft.stockLineId) ||
    (draft.given === false && !!draft.notGivenReason);

  return {
    query: { dose: data, isLoading },
    draft,
    isComplete,
    isDirty: Object.keys(patch).length > 0,
    updateDraft: (update: Partial<VaccinationDraft>) =>
      setPatch({ ...patch, ...update }),
    create: insert,
  };
}

const useInsert = ({
  encounterId,
  vaccineCourseDoseId,
}: {
  encounterId: string;
  vaccineCourseDoseId: string;
}) => {
  const { api, storeId, queryClient } = useVaccinationsGraphQL();
  const t = useTranslation('dispensary');

  const mutationFn = async (input: VaccinationDraft) => {
    const apiResult = await api.insertVaccination({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        encounterId,
        vaccineCourseDoseId,

        given: input.given ?? false,
        vaccinationDate: Formatter.naiveDate(input.date ?? new Date()),
        clinicianId: input.clinician?.id,
        comment: input.comment,
        notGivenReason: input.notGivenReason,
        stockLineId: input.stockLineId,
      },
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.insertVaccination;

      if (result.__typename === 'VaccinationNode') {
        return result;
      }
    }

    throw new Error(t('error.failed-to-save-vaccination'));
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([VACCINATION]),
  });
};
