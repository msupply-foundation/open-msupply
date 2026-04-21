import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@openmsupply-client/common';
import { useSiteGraphQL } from '../useSiteGraphQL';
import { SiteStoreRowFragment } from '../operations.generated';
import { SITE } from './keys';

const SITE_STORES = 'site-stores';

export const useStoresForSite = (siteId: number, enabled = true) => {
  const { siteApi } = useSiteGraphQL();

  const queryFn = async (): Promise<{
    nodes: SiteStoreRowFragment[];
    totalCount: number;
  }> => {
    const result = await siteApi.storesBySite({ siteId });
    return {
      nodes: result.stores.nodes ?? [],
      totalCount: result.stores.totalCount ?? 0,
    };
  };

  return useQuery({
    queryKey: [SITE, SITE_STORES, siteId],
    queryFn,
    enabled,
    cacheTime: 0,
  });
};

export const useAssignStoresToSite = () => {
  const { siteApi } = useSiteGraphQL();
  const queryClient = useQueryClient();

  const mutationFn = async (input: { siteId: number; storeIds: string[] }) => {
    const result = await siteApi.assignStoresToSite({ input });
    return result?.centralServer?.site?.assignStoresToSite;
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([SITE, SITE_STORES]);
    },
    onError: (e: unknown) => {
      console.error(e);
    },
  });
};
