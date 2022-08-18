import {
  SortBy,
  FilterBy,
  InsertProgramInput,
  UpdateProgramInput,
} from '@openmsupply-client/common';
import { ProgramRowFragment } from '../../api';
import { ProgramEnrolmentDocumentFragment, Sdk } from './operations.generated';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<ProgramRowFragment>;
  filterBy?: FilterBy | null;
};

export const getProgramEnrolmentQueries = (sdk: Sdk, storeId: string) => ({
  insertProgram: async (
    input: InsertProgramInput
  ): Promise<ProgramEnrolmentDocumentFragment> => {
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
  ): Promise<ProgramEnrolmentDocumentFragment> => {
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
