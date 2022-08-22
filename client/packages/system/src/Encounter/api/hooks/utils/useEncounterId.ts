import { useParams } from '@openmsupply-client/common';

export const useEncounterId = () => {
  const { id = '' } = useParams();
  return decodeURIComponent(id);
};
