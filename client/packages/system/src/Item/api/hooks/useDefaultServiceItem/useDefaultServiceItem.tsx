import { useServiceItems } from '../useServiceItems';

export const useDefaultServiceItem = () => {
  const { data: items, isLoading, error } = useServiceItems();

  // find the first service item with the code 'service'
  // or if that fails, simply the first service item
  const defaultServiceItem =
    items?.nodes.find(({ code }) => code === 'service') ?? items?.nodes?.[0];

  return { defaultServiceItem, isLoading, error };
};
