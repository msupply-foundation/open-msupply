import {
  SortBy,
  FilterBy,
  DocumentRegistrySortFieldInput,
  DocumentRegistryNode,
} from '@openmsupply-client/common';
import { ProgramDocumentRegistryFragment, Sdk } from './operations.generated';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<DocumentRegistryNode>;
  filterBy?: FilterBy | null;
};

export const getProgramQueries = (sdk: Sdk) => ({
  get: {
    list: async ({
      sortBy,
    }: ListParams): Promise<{
      nodes: ProgramDocumentRegistryFragment[];
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
