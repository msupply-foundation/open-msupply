import {
  FilterBy,
  SortBy,
  RequisitionNodeStatus,
  UpdateRequestRequisitionInput,
  UpdateRequestRequisitionStatusInput,
  RequisitionSortFieldInput,
} from '@openmsupply-client/common';
import { DraftRequestRequisitionLine } from './../DetailView/RequestLineEdit/hooks';
import {
  RequestRequisitionRowFragment,
  getSdk,
  RequestRequisitionFragment,
  RequestRequisitionsQuery,
} from './operations.generated';

export type RequestRequisitionApi = ReturnType<typeof getSdk>;

const requisitionParser = {
  toDeleteInput: (line: RequestRequisitionRowFragment) => {
    return { id: line.id };
  },
  toInsertLineInput: (line: DraftRequestRequisitionLine) => ({
    id: line.id,
    itemId: line.itemId,
    requisitionId: line.requisitionId,
    requestedQuantity: line.requestedQuantity,
  }),
  toUpdateLineInput: (line: DraftRequestRequisitionLine) => ({
    id: line.id,
    requestedQuantity: line.requestedQuantity,
  }),
  toUpdateInput: (
    requisition: Partial<RequestRequisitionFragment> & { id: string }
  ): UpdateRequestRequisitionInput => {
    return {
      id: requisition.id,
      // otherPartyId: requisition.otherParty?.id,
      comment: requisition.comment,
      theirReference: requisition.theirReference,
      colour: requisition.colour,
      status:
        requisition.status === RequisitionNodeStatus.Sent
          ? UpdateRequestRequisitionStatusInput.Sent
          : undefined,
    };
  },
};

export const RequestRequisitionQueries = {
  get: {
    list:
      (
        api: RequestRequisitionApi,
        storeId: string,
        {
          first,
          offset,
          sortBy,
          filter,
        }: {
          first: number;
          offset: number;
          sortBy: SortBy<RequestRequisitionRowFragment>;
          filter: FilterBy | null;
        }
      ) =>
      async (): Promise<RequestRequisitionsQuery['requisitions']> => {
        const result = await api.requestRequisitions({
          storeId,
          page: { offset, first },
          sort: {
            key: sortBy.key as RequisitionSortFieldInput,
            desc: !!sortBy.isDesc,
          },
          filter: { ...filter },
        });
        return result.requisitions;
      },
    byNumber:
      (api: RequestRequisitionApi) =>
      async (
        requisitionNumber: number,
        storeId: string
      ): Promise<RequestRequisitionFragment> => {
        const result = await api.requestRequisition({
          storeId,
          requisitionNumber,
        });

        if (result.requisitionByNumber.__typename === 'RequisitionNode') {
          return result.requisitionByNumber;
        }

        throw new Error('Record not found');
      },
  },
  upsertLine:
    (api: RequestRequisitionApi, storeId: string) =>
    async (draftLine: DraftRequestRequisitionLine) => {
      let result;
      if (draftLine.isCreated) {
        const input = requisitionParser.toInsertLineInput(draftLine);
        result = await api.insertRequestRequisitionLine({
          storeId,
          input,
        });

        const { insertRequestRequisitionLine } = result;
        if (insertRequestRequisitionLine.__typename === 'RequisitionLineNode') {
          return insertRequestRequisitionLine;
        }
      } else {
        const input = requisitionParser.toUpdateLineInput(draftLine);
        result = await api.updateRequestRequisitionLine({
          storeId,
          input,
        });

        const { updateRequestRequisitionLine } = result;
        if (updateRequestRequisitionLine.__typename === 'RequisitionLineNode') {
          return updateRequestRequisitionLine;
        }
      }

      throw new Error('Unable to update requisition');
    },
  update:
    (api: RequestRequisitionApi, storeId: string) =>
    async (
      patch: Partial<RequestRequisitionFragment> & { id: string }
    ): Promise<{ __typename: 'RequisitionNode'; id: string }> => {
      const input = requisitionParser.toUpdateInput(patch);
      const result = await api.updateRequestRequisition({
        storeId,
        input,
      });

      const { updateRequestRequisition } = result;

      if (updateRequestRequisition.__typename === 'RequisitionNode') {
        return updateRequestRequisition;
      }

      throw new Error('Unable to update requisition');
    },
  create:
    (api: RequestRequisitionApi, storeId: string) =>
    async ({
      id,
      otherPartyId,
    }: {
      id: string;
      otherPartyId: string;
    }): Promise<{
      __typename: 'RequisitionNode';
      id: string;
      requisitionNumber: number;
    }> => {
      const result = await api.insertRequestRequisition({
        storeId,
        input: {
          id,
          otherPartyId,
          maxMonthsOfStock: 1,
          minMonthsOfStock: 1,
        },
      });

      const { insertRequestRequisition } = result;

      if (insertRequestRequisition.__typename === 'RequisitionNode') {
        return insertRequestRequisition;
      }

      throw new Error('Unable to create requisition');
    },
  deleteRequisitions:
    (api: RequestRequisitionApi, storeId: string) =>
    async (requisitions: RequestRequisitionRowFragment[]) => {
      const promises = requisitions.map(requisition => {
        const input = requisitionParser.toDeleteInput(requisition);
        return api.deleteRequestRequisition({ input, storeId });
      });
      const results = await Promise.all(promises);

      const success = results.every(({ deleteRequestRequisition }) => {
        return deleteRequestRequisition.__typename === 'DeleteResponse';
      });

      if (success) return results;

      throw new Error('Could not delete requisitions');
    },
};
