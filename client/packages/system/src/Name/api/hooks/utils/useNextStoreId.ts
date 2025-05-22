import { useStores } from '../document/useStores';

export const useNextStoreId = (currentId: string): string | undefined => {
  const { data } = useStores();

  const rows = data?.nodes ?? [];

  const idx = rows.findIndex(r => r.id === currentId);

  const next = rows[idx + 1];

  return next?.id;
};
