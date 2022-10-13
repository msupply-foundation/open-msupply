import { DisplaySettingsHash, useQuery } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useDisplaySettings = (input: DisplaySettingsHash) => {
  const api = useHostApi();
  return useQuery(api.keys.displaySettings(), async () =>
    api.get.displaySettings(input)
  );
};
