import { Utils } from '@openmsupply-client/system/src/Patient/api/hooks/utils';
import { PatientSchema } from '@openmsupply-client/programs';

export const usePatientSearchQuery = () => {
  const { data, error, isLoading, mutateAsync } = Utils.usePatientSearch();

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
