import { FilterBy, SortBy, useMutation } from '@openmsupply-client/common';
import { MasterListRowFragment } from '../../operations.generated';
import { useMasterListApi } from '../utils/useMasterListApi';

export const useMasterListsAll = (
  sortBy: SortBy<MasterListRowFragment>,
  filterBy?: FilterBy
) => {
  const api = useMasterListApi();

  return {
    ...useMutation(api.keys.sortedList(sortBy, filterBy), () =>
      api.get.listAll({ sortBy, filterBy })
    ),
  };
};
