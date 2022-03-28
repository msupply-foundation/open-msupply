import { useItem } from '../useItem';

export const useItemFields = () => {
  const { data } = useItem();
  return { ...data };
};
