import { useQuery } from '@openmsupply-client/common';
import { usePatientGraphQL } from '../usePatientGraphQL';
import { VACCINATION_CARD } from './keys';

export const usePatientVaccineCard = (
  patientId: string,
  programEnrolmentId: string
) => {
  const { patientApi, storeId } = usePatientGraphQL();

  // TO-DO: Remove console.log once these variables actually used
  console.log(patientId, programEnrolmentId, patientApi, storeId);

  const { data, isLoading } = useQuery({
    queryKey: [VACCINATION_CARD, programEnrolmentId],
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
