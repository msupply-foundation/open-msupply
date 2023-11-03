import { useParams } from '@openmsupply-client/common';

export const useIdFromUrl = () => {
  const { id = '' } = useParams();
  return decodeURIComponent(id);
};
