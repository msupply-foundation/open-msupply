import {
  SortBy,
  FilterBy,
  ProgramSortFieldInput,
  InsertProgramInput,
  UpdateProgramInput,
} from '@openmsupply-client/common';
import { DocumentFragment, ProgramFragment, Sdk } from './operations.generated';

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

  insertProgram: async (
    input: InsertProgramInput
  ): Promise<DocumentFragment> => {
    const result = await sdk.insertProgram({
      storeId,
      input,
    });

    if (result.insertProgram.__typename === 'DocumentNode') {
      return result.insertProgram;
    }

    throw new Error('Could not insert program');
  },

  updateProgram: async (
    input: UpdateProgramInput
  ): Promise<DocumentFragment> => {
    const result = await sdk.updateProgram({
      storeId,
      input,
    });

    if (result.updateProgram.__typename === 'DocumentNode') {
      return result.updateProgram;
    }

    throw new Error('Could not update program');
  },
});
