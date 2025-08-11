import { useItem } from '../useItem';

export const useItemFields = () => {
  const {
    byId: { data },
  } = useItem();
  return { ...data };
};
