import { useMutation } from 'react-query';
import { useQueryParams } from '@common/hooks';
import { useAuthApi } from './useAuthApi';

export const useStores = () => {
  const api = useAuthApi();
  const initialListParameters = { initialSortBy: { key: 'code' } };
  const { filterBy, first, offset } = useQueryParams(initialListParameters);
  const getStores = api.get.stores({ filterBy, first, offset });
  const { mutate, ...rest } = useMutation(getStores);

  return { mutate, ...rest };
};
