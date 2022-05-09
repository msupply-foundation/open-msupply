import { useMasterList } from './useMasterList';

export const useMasterListFields = () => {
  const { data } = useMasterList();
  return { ...data };
};
