import {
  ConfigurePropertyGqlInput,
  useMutation,
} from '@openmsupply-client/common';
import { usePropertyGraphQL } from '../usePropertyGraphQL';
import { PROPERTIES } from './keys';

export const useConfigureProperty = () => {
  const { propertyApi, queryClient } = usePropertyGraphQL();

  return useMutation({
    mutationFn: async (input: ConfigurePropertyGqlInput) => {
      const result = await propertyApi.configureProperty({ input });
      return result.configureProperty;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PROPERTIES] }),
  });
};
