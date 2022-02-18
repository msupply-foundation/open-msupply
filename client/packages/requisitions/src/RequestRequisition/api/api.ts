import {
  FilterBy,
  SortBy,
  RequisitionNodeStatus,
  UpdateRequestRequisitionInput,
  UpdateRequestRequisitionStatusInput,
  RequisitionSortFieldInput,
} from '@openmsupply-client/common';
import {
  RequestRequisitionRowFragment,
  getSdk,
  RequestRequisitionFragment,
  RequestRequisitionsQuery,
} from './operations.generated';

export type RequestRequisitionApi = ReturnType<typeof getSdk>;

export const requisitionToInput = (
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

  update:
    (api: RequestRequisitionApi, storeId: string) =>
    async (
      patch: Partial<RequestRequisitionFragment> & { id: string }
    ): Promise<{ __typename: 'RequisitionNode'; id: string }> => {
      const input = requisitionToInput(patch);
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
          thresholdMonthsOfStock: 1,
        },
      });

      const { insertRequestRequisition } = result;

      if (insertRequestRequisition.__typename === 'RequisitionNode') {
        return insertRequestRequisition;
      }

      throw new Error('Unable to create requisition');
    },
};
