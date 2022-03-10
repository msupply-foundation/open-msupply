import { useServiceItems } from '../useServiceItems';

export const useDefaultServiceItem = () => {
  const { data: items, isLoading, error } = useServiceItems();

  const defaultServiceItem = items?.nodes.find(
    ({ code }) => code === 'service'
  );

  return { defaultServiceItem, isLoading, error };
};
