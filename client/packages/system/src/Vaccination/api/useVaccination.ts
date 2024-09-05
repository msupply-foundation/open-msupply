import { useState } from 'react';
import { useIntlUtils, useQuery } from '@openmsupply-client/common';

import { Clinician, ClinicianAutocompleteOption } from '../../Clinician';
import { useVaccinationsGraphQL } from './useVaccinationsGraphQL';
import { VACCINATION } from './keys';

export interface VaccinationDraft {
  clinician?: ClinicianAutocompleteOption | null;
  given?: boolean;
  comment?: string;
  date?: Date | null;
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
  const { getLocalisedFullName } = useIntlUtils();

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

  const defaults: Partial<VaccinationDraft> = {
    date: new Date(),
    clinician: defaultClinician
      ? {
          value: defaultClinician,
          label: getLocalisedFullName(
            defaultClinician.firstName,
            defaultClinician.lastName
          ),
        }
      : undefined,
  };

  const draft: VaccinationDraft | undefined = data
    ? { ...defaults, ...data, ...patch }
    : undefined;

  return {
    query: { dose: data, isLoading },
    draft,
    updateDraft: (update: Partial<VaccinationDraft>) =>
      setPatch({ ...patch, ...update }),
  };
}
