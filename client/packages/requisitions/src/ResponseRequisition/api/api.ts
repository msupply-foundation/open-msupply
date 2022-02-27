import {
  SortBy,
  FilterBy,
  RequisitionSortFieldInput,
  RequisitionNodeType,
  UpdateResponseRequisitionInput,
  UpdateResponseRequisitionStatusInput,
  UpdateResponseRequisitionLineInput,
} from '@openmsupply-client/common';

import {
  getSdk,
  ResponseRequisitionFragment,
  ResponseRequisitionRowFragment,
  ResponseRequisitionsQuery,
} from './operations.generated';
import { DraftResponseLine } from './../DetailView/ResponseLineEdit/hooks';

export type ResponseRequisitionApi = ReturnType<typeof getSdk>;

const responseParser = {
  toUpdateInput: (
    requisition: Partial<ResponseRequisitionFragment> & { id: string }
  ): UpdateResponseRequisitionInput => {
    return {
      id: requisition.id,
      comment: requisition.comment,
      theirReference: requisition.theirReference,
      colour: requisition.colour,
      status: requisition.status
        ? UpdateResponseRequisitionStatusInput.Finalised
        : undefined,
    };
  },
  toUpdateLineInput: (
    patch: DraftResponseLine
  ): UpdateResponseRequisitionLineInput => ({
    id: patch.id,
    supplyQuantity: patch.supplyQuantity,
  }),
};

export const ResponseRequisitionQueries = {
  get: {
    list:
      (
        api: ResponseRequisitionApi,
        storeId: string,
        {
          first,
          offset,
          sortBy,
          filter,
        }: {
          first: number;
          offset: number;
          sortBy: SortBy<ResponseRequisitionRowFragment>;
          filter: FilterBy | null;
        }
      ) =>
      async (): Promise<ResponseRequisitionsQuery['requisitions']> => {
        const result = await api.responseRequisitions({
          storeId,
          page: { offset, first },
          sort: {
            key: sortBy.key as RequisitionSortFieldInput,
            desc: !!sortBy.isDesc,
          },
          filter: {
            ...filter,
            type: { equalTo: RequisitionNodeType.Response },
          },
        });
        return result.requisitions;
      },
    byNumber:
      (api: ResponseRequisitionApi) =>
      async (
        requisitionNumber: number,
        storeId: string
      ): Promise<ResponseRequisitionFragment> => {
        const result = await api.responseRequisition({
          storeId,
          requisitionNumber,
        });

        if (result.requisitionByNumber.__typename === 'RequisitionNode') {
          return result.requisitionByNumber;
        }

        throw new Error('Record not found');
      },
  },
  update:
    (api: ResponseRequisitionApi, storeId: string) =>
    async (
      patch: Partial<ResponseRequisitionFragment> & { id: string }
    ): Promise<{ __typename: 'RequisitionNode'; id: string }> => {
      const input = responseParser.toUpdateInput(patch);
      const result = await api.updateResponseRequisition({ storeId, input });

      const { updateResponseRequisition } = result;

      if (updateResponseRequisition.__typename === 'RequisitionNode') {
        return updateResponseRequisition;
      }

      throw new Error('Unable to update requisition');
    },
  updateLine:
    (api: ResponseRequisitionApi, storeId: string) =>
    async (patch: DraftResponseLine) => {
      const result = await api.updateResponseRequisitionLine({
        storeId,
        input: responseParser.toUpdateLineInput(patch),
      });

      if (
        result.updateResponseRequisitionLine.__typename ===
        'RequisitionLineNode'
      ) {
        return result.updateResponseRequisitionLine;
      } else throw new Error('Could not update response line');
    },
};
