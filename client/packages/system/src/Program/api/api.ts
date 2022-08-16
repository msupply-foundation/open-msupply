import {
  SortBy,
  FilterBy,
  DocumentRegistrySortFieldInput,
} from '@openmsupply-client/common';
import { ProgramDocumentFragment, Sdk } from './operations.generated';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<ProgramDocumentFragment>;
  filterBy?: FilterBy | null;
};

export const getProgramQueries = (sdk: Sdk) => ({
  get: {
    list: async ({
      sortBy,
    }: ListParams): Promise<{
      nodes: ProgramDocumentFragment[];
      totalCount: number;
    }> => {
      const result = await sdk.programs({
        key:
          (sortBy?.key as DocumentRegistrySortFieldInput) ??
          DocumentRegistrySortFieldInput.DocumentType,
        desc: sortBy?.isDesc,
      });

      return result?.documentRegistries;
    },
  },
});
