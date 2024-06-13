import {
  useIntlUtils,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { NAME_PROPERTIES_KEY } from '@openmsupply-client/system';
import { useHostApi } from '../utils/useHostApi';
import { gapsNameProperties } from './namePropertyData';

export const useConfigureNameProperties = () => {
  const api = useHostApi();
  const queryClient = useQueryClient();

  const { currentLanguage } = useIntlUtils();

  return useMutation(
    () =>
      api.configureNameProperties(
        gapsNameProperties[currentLanguage] ?? gapsNameProperties.en
      ),
    {
      onSuccess: () => queryClient.invalidateQueries(NAME_PROPERTIES_KEY),
    }
  );
};
