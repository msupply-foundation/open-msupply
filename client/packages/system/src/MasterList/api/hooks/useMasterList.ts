import { useParams, useQuery } from '@openmsupply-client/common';
import { useMasterListGraphQL } from '../useMasterListGraphQL';
import { MASTER_LIST } from './keys';

export const useMasterList = () => {
  const { masterListApi, storeId } = useMasterListGraphQL();
  const queryKey = [MASTER_LIST];
  const { id } = useParams();

  const queryFn = async () => {
    const query = await masterListApi.masterList({
      filter: { id: { equalTo: id } },
      storeId,
    });

    if (
      query?.masterLists?.totalCount === 1 &&
      query?.masterLists?.nodes[0]?.__typename === 'MasterListNode'
    ) {
      return query?.masterLists.nodes[0];
    }
    throw new Error(`Master list with id ${id} not found.`);
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });
  return query;
};
