import {
  PropertyDisplayModeV2Input,
  useMutation,
  useTranslation,
} from '@openmsupply-client/common';
import { usePropertiesGraphQL } from '../usePropertiesGraphQL';
import { PropertyConfigKeys } from './keys';

export interface SetPropertyDisplayModeParams {
  propertyId: string;
  tableName: string;
  /** `null` disassociates the property from the scope (removes the row). */
  displayMode: PropertyDisplayModeV2Input | null;
}

/**
 * Sets (or clears) how a property is displayed on a single table scope. Saves
 * immediately on each change; on success the catalogue query is invalidated so
 * the list/detail reflect the new state.
 */
export const useSetPropertyDisplayMode = () => {
  const { api, queryClient } = usePropertiesGraphQL();
  const t = useTranslation();

  return useMutation({
    mutationFn: async ({
      propertyId,
      tableName,
      displayMode,
    }: SetPropertyDisplayModeParams) => {
      const result = await api.setPropertyDisplayMode({
        input: { propertyId, tableName, displayMode },
      });
      const node = result.centralServer.general.setPropertyDisplayMode;
      if (node.__typename === 'SetPropertyDisplayModeNode') {
        return node;
      }
      throw new Error(t('error.something-wrong'));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: PropertyConfigKeys.base() }),
  });
};
