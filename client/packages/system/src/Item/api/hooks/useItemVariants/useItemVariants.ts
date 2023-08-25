import { useQuery } from 'react-query';
import { useItemApi } from '../useItemApi';

export const useItemVariants = () => {
  const api = useItemApi();

  return useQuery(api.keys.itemVariantsList(), () =>
    api.get.itemVariantsList()
  );
};
