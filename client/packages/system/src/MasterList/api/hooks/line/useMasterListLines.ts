import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useMasterListApi } from '../utils/useMasterListApi';
import { useMasterListId } from '../document/useMasterList';

export const useMasterListLines = () => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
  });

  const api = useMasterListApi();
  const masterListId = useMasterListId();

  return useQuery(api.keys.lines(masterListId, queryParams), () =>
    api.get.lines(masterListId, queryParams)
  );
};
