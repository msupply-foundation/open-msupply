import { useQuery } from '@openmsupply-client/common';
import { usePatientGraphQL } from '../usePatientGraphQL';
import { VACCINATION } from './keys';

export const usePatientVaccineCard = (programEnrolmentId: string) => {
  const { patientApi, storeId } = usePatientGraphQL();

  const { data, isLoading } = useQuery({
    queryKey: [VACCINATION, programEnrolmentId],
    queryFn: async () => {
      const result = await patientApi.vaccinationCard({
        storeId,
        programEnrolmentId,
      });

      if (result.vaccinationCard.__typename === 'VaccinationCardNode') {
        return result.vaccinationCard;
      }
    },
  });

  return { query: { data, isLoading } };
};
