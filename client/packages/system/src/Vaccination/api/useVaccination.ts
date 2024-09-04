import { useState } from 'react';
import { ClinicianAutocompleteOption } from '../../Clinician';

interface VaccinationDraft {
  clinician?: ClinicianAutocompleteOption | null;
  given?: boolean;
}

export function useVaccination({
  vaccineCourseDoseId,
  vaccinationId,
}: {
  vaccineCourseDoseId: string;
  vaccinationId: string | undefined;
}) {
  const data: VaccinationDraft | undefined = {};
  const [patch, setPatch] = useState<Partial<VaccinationDraft>>({});

  const draft: VaccinationDraft | undefined = data
    ? { ...data, ...patch }
    : undefined;

  return {
    query: { isLoading: false },
    draft,
    updateDraft: (update: Partial<VaccinationDraft>) =>
      setPatch({ ...patch, ...update }),
  };
}
