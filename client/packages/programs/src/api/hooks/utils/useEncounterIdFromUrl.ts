import { useParams } from '@openmsupply-client/common';

export const useEncounterIdFromUrl = () => {
  const { id = '' } = useParams();
  return decodeURIComponent(id);
};
