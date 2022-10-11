import { useQuery } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useDisplaySettings = () => {
  const api = useHostApi();
  return useQuery(api.keys.displaySettings(), api.get.displaySettings);
};
