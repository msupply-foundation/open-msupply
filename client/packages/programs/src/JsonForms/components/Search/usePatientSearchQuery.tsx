import { usePatient } from '@openmsupply-client/system';

export const usePatientSearchQuery = () => {
  const { data, error, isPending: isLoading, mutateAsync } = usePatient.utils.search();

  // Leaving as any[] as documentDraft could be any type
  const results =
    data?.nodes.map(patient => ({
      ...patient.patient,
      ...patient.patient.documentDraft, // extend with full patient document if exists
    })) ?? [];

  return {
    results,
    isLoading,
    error,
    mutateAsync,
  };
};
