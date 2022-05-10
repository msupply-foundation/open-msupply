import { SortBy, useMutation } from '@openmsupply-client/common';
import { MasterListRowFragment } from '../../operations.generated';
import { useMasterListApi } from '../utils/useMasterListApi';

export const useMasterListsAll = (sortBy: SortBy<MasterListRowFragment>) => {
  const api = useMasterListApi();

  return {
    ...useMutation(api.keys.sortedList(sortBy), () =>
      api.get.listAll({ sortBy })
    ),
  };
};
