import {
  FilterByWithBoolean,
  SortBy,
  useMutation,
} from '@openmsupply-client/common';
import { MasterListRowFragment } from '../../operations.generated';
import { useMasterListApi } from '../utils/useMasterListApi';

export const useMasterListsAll = (
  sortBy: SortBy<MasterListRowFragment>,
  filterBy?: FilterByWithBoolean
) => {
  const api = useMasterListApi();
  const result = useMutation(api.keys.sortedList(sortBy, filterBy), () =>
    api.get.listAll({ sortBy, filterBy })
  );
  return {
    ...result,
    fetchAsync: result.mutateAsync,
  };
};
