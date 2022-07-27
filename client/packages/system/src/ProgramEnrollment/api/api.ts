import {
  SortBy,
  FilterBy,
  ProgramSortFieldInput,
} from '@openmsupply-client/common';
import { ProgramFragment, Sdk } from './operations.generated';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<ProgramFragment>;
  filterBy?: FilterBy | null;
};

export const getProgramEnrolmentQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({
      sortBy,
      filterBy,
    }: ListParams): Promise<{
      nodes: ProgramFragment[];
      totalCount: number;
    }> => {
      const result = await sdk.programs({
        storeId,
        key: sortBy?.key as ProgramSortFieldInput | undefined,
        desc: sortBy?.isDesc,
        filter: filterBy,
      });

      return result?.programs;
    },
  },
});
