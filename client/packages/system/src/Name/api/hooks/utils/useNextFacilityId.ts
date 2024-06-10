import { useFacilities } from '../document/useFacilities';

export const useNextFacilityId = (currentId: string): string | undefined => {
  const { data } = useFacilities();

  const rows = data?.nodes ?? [];

  const idx = rows.findIndex(r => r.id === currentId);

  const next = rows[idx + 1];

  return next?.id;
};
