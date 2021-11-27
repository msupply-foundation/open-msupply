import { ListResponse } from '../../data';

export const createListResponse = <T, K>(
  totalCount: number,
  nodes: T[],
  typeName: K
): ListResponse<T, K> => ({
  totalCount,
  nodes,
  __typename: typeName as K,
});
