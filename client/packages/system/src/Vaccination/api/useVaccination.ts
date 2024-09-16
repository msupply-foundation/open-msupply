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

export interface VaccinationStockLine {
  id: string;
  itemId: string;
  batch?: string | null;
}

export interface VaccinationDraft {
  clinician?: Clinician | null;
  date: Date | null;
  given?: boolean | null;
  comment?: string | null;
  itemId?: string;
  stockLine?: VaccinationStockLine | null;
  notGivenReason?: string | null;
}

export function useVaccination({
  vaccineCourseDoseId,
  vaccinationId,
  encounterId,
  defaultClinician,
}: {
  vaccineCourseDoseId: string;
  encounterId?: string;
  vaccinationId: string | undefined;
  defaultClinician?: Clinician;
}) {
  const { storeId, api } = useVaccinationsGraphQL();

  const { data: dose, isLoading: doseLoading } = useQuery({
    queryKey: [VACCINATION, vaccineCourseDoseId],
    queryFn: async () => {
      const result = await api.vaccineCourseDose({
        doseId: vaccineCourseDoseId,
      });

      if (result.vaccineCourseDose.__typename === 'VaccineCourseDoseNode') {
        return result.vaccineCourseDose;
      }
    },
  });
  const { data: vaccination, isLoading: vaccinationLoading } = useQuery({
    queryKey: [VACCINATION, vaccinationId],
    queryFn: async () => {
      if (!vaccinationId) {
        return null;
      }
      const result = await api.vaccination({ vaccinationId, storeId });

      if (result.vaccination?.__typename === 'VaccinationNode') {
        return result.vaccination;
      }
    },
    enabled: !!vaccinationId,
  });

  const { mutateAsync: insert } = useInsert({
    encounterId: encounterId ?? '',
    vaccineCourseDoseId,
  });

  const [patch, setPatch] = useState<Partial<VaccinationDraft>>({});

  const {
    clinician,
    vaccinationDate,
    comment,
    given,
    notGivenReason,
    stockLine,
  } = vaccination ?? {};

  const defaults: VaccinationDraft = {
    // Default to today
    date: vaccinationDate ? new Date(vaccinationDate) : new Date(),
    // If new vaccination, default to encounter clinician
    clinician: vaccination ? clinician : defaultClinician,

    // Populate with existing vaccination data
    comment,
    stockLine,
    given,
    notGivenReason,
    itemId: stockLine?.itemId,
  };

  const draft: VaccinationDraft = { ...defaults, ...patch };

  const isComplete =
    (draft.given && !!draft.itemId && !!draft.stockLine) ||
    (draft.given === false && !!draft.notGivenReason);

  return {
    query: { dose, vaccination, isLoading: doseLoading || vaccinationLoading },
    draft,
    isComplete,
    isDirty: Object.keys(patch).length > 0,
    updateDraft: (update: Partial<VaccinationDraft>) =>
      setPatch({ ...patch, ...update }),
    create: encounterId ? insert : () => {},
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
        stockLineId: input.stockLine?.id,
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
