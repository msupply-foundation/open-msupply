import { useQuery } from 'react-query';
import { useNotification } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { useItemGraphQL } from '../useItemApi';
import { ITEM_VARIANTS } from '../../keys';

export const useIsCentralServerApi = () => {
  const { api, storeId } = useItemGraphQL();
  const { data } = useQuery({
    queryKey: [ITEM_VARIANTS],
    queryFn: async () => {
      const result = await api.itemVariantsConfigured({
        storeId,
      });

      return result.itemVariantsConfigured;
    },
    // Only call on page load
    refetchOnMount: false,
  });

  return !!data;
};

const returnOrFallback =
  (isCentralServer: boolean, fallback: () => void) =>
  <T>(f: T | (() => void)) =>
    isCentralServer ? f : fallback;

export const useCentralServerCallback = () => {
  const { warning } = useNotification();
  const isCentralServer = useIsCentralServerApi();
  const t = useTranslation();

  return {
    executeIfCentralOrShowWarning: returnOrFallback(
      isCentralServer,
      warning(t('auth.not-a-central-server'))
    ),
  };
};
