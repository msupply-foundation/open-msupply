import { PatientSchema } from '@openmsupply-client/programs';
import { usePatient } from '@openmsupply-client/system';

export const usePatientSearchQuery = () => {
  const { data, error, isLoading, mutateAsync } = usePatient.utils.search();

  const results =
    // If patient has a full document field, use that since it'll make more data
    // available. Otherwise just use the basic Patient fields
    data?.nodes.map(
      patient =>
        (patient.patient.documentDraft as PatientSchema) ?? patient.patient
    ) ?? [];

  return {
    results,
    isLoading,
    error,
    mutateAsync,
  };
};
