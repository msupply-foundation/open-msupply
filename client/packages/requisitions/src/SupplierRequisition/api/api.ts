import {
  RequisitionNodeStatus,
  UpdateRequestRequisitionInput,
  UpdateRequestRequisitionStatusInput,
} from '@openmsupply-client/common';
import {
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
      (api: RequestRequisitionApi, storeId: string) =>
      async (): Promise<RequestRequisitionsQuery['requisitions']> => {
        const result = await api.requestRequisitions({
          storeId,
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
    (api: RequestRequisitionApi) =>
    async (
      patch: Partial<RequestRequisitionFragment> & { id: string }
    ): Promise<{ __typename: 'RequisitionNode'; id: string }> => {
      const input = requisitionToInput(patch);
      const result = await api.updateRequestRequisition({
        storeId: '',
        input,
      });

      const { updateRequestRequisition } = result;

      if (updateRequestRequisition.__typename === 'RequisitionNode') {
        return updateRequestRequisition;
      }

      throw new Error('Unable to update requisition');
    },
  create:
    (api: RequestRequisitionApi) =>
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
        storeId: '8D967C2618BE4D78B3A6FAD6C1C8FF25',
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
