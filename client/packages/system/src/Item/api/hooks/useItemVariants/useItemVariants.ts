import { useQuery } from 'react-query';
import { useItemApi } from '../useItemApi';

export const useUnitVariantList = () => {
  const api = useItemApi();

  return useQuery(api.keys.unitVariantsList(), () =>
    api.get.unitVariantsList()
  );
};
