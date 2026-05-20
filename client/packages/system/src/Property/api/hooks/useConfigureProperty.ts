import {
  ConfigurePropertyV2GqlInput,
  useMutation,
} from '@openmsupply-client/common';
import { usePropertyGraphQL } from '../usePropertyGraphQL';
import { PROPERTIES } from './keys';

export const useConfigureProperty = () => {
  const { propertyApi, queryClient } = usePropertyGraphQL();

  return useMutation({
    mutationFn: async (input: ConfigurePropertyV2GqlInput) => {
      const result = await propertyApi.configurePropertyV2({ input });
      return result.configurePropertyV2;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PROPERTIES] }),
  });
};
