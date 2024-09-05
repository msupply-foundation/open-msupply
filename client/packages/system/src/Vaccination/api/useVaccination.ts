import { useState } from 'react';
import { useQuery } from '@openmsupply-client/common';

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
  defaultClinician,
}: {
  vaccineCourseDoseId: string;
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

  const [patch, setPatch] = useState<Partial<VaccinationDraft>>({});

  const defaults: VaccinationDraft = {
    date: new Date(),
    clinician: defaultClinician,
    stockLineId: 'TODO',
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
  };
}
