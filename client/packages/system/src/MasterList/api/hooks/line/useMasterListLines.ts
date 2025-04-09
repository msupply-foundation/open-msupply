import {
  useParams,
  useQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useMasterListApi } from '../utils/useMasterListApi';

export const useMasterListLines = () => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'itemName', dir: 'asc' },
  });
  const { id } = useParams();

  const api = useMasterListApi();
  const masterListId = id || '';

  return useQuery(api.keys.lines(masterListId, queryParams), () =>
    api.get.lines(masterListId, queryParams)
  );
};
