import { useQuery } from '@openmsupply-client/common';
import { useVaccinationsGraphQL } from './useVaccinationsGraphQL';
import { VACCINATION_CARD } from './keys';

export const usePatientVaccineCard = (programEnrolmentId: string) => {
  const { api, storeId } = useVaccinationsGraphQL();

  const { data, isLoading } = useQuery({
    queryKey: [VACCINATION_CARD, programEnrolmentId],
    queryFn: async () => {
      const result = await api.vaccinationCard({
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
