import { RequisitionNodeStatus } from './../../../../common/src/types/schema';
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
  Sdk,
} from './operations.generated';
import { DraftResponseLine } from './../DetailView/ResponseLineEdit/hooks';

export type ResponseRequisitionApi = ReturnType<typeof getSdk>;

const responseParser = {
  toStatus: (
    patch: Partial<ResponseRequisitionFragment> & { id: string }
  ): UpdateResponseRequisitionStatusInput | undefined => {
    switch (patch.status) {
      case RequisitionNodeStatus.Finalised:
        return UpdateResponseRequisitionStatusInput.Finalised;
      default:
        return undefined;
    }
  },
  toSortField: (
    sortBy: SortBy<ResponseRequisitionRowFragment>
  ): RequisitionSortFieldInput => {
    switch (sortBy.key) {
      case 'createdDatetime': {
        return RequisitionSortFieldInput.CreatedDatetime;
      }
      case 'otherPartyName': {
        return RequisitionSortFieldInput.OtherPartyName;
      }
      case 'requisitionNumber': {
        return RequisitionSortFieldInput.RequisitionNumber;
      }
      case 'status': {
        return RequisitionSortFieldInput.Status;
      }

      case 'sentDatetime':
      case 'finalisedDatetime':
      case 'comment':
      default: {
        return RequisitionSortFieldInput.CreatedDatetime;
      }
    }
  },
  toUpdate: (
    requisition: Partial<ResponseRequisitionFragment> & { id: string }
  ): UpdateResponseRequisitionInput => {
    return {
      id: requisition.id,
      comment: requisition.comment,
      theirReference: requisition.theirReference,
      colour: requisition.colour,
      status: responseParser.toStatus(requisition),
    };
  },
  toUpdateLine: (
    patch: DraftResponseLine
  ): UpdateResponseRequisitionLineInput => ({
    id: patch.id,
    supplyQuantity: patch.supplyQuantity,
  }),
};

export const getResponseQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({
      first,
      offset,
      sortBy,
      filter,
    }: {
      first: number;
      offset: number;
      sortBy: SortBy<ResponseRequisitionRowFragment>;
      filter: FilterBy | null;
    }) => {
      const result = await sdk.responseRequisitions({
        storeId,
        page: { offset, first },
        sort: {
          key: responseParser.toSortField(sortBy),
          desc: !!sortBy.isDesc,
        },
        filter: {
          ...filter,
          type: { equalTo: RequisitionNodeType.Response },
        },
      });
      return result.requisitions;
    },
    byNumber: async (
      requisitionNumber: string
    ): Promise<ResponseRequisitionFragment> => {
      const result = await sdk.responseRequisition({
        storeId,
        requisitionNumber: Number(requisitionNumber),
      });

      if (result.requisitionByNumber.__typename === 'RequisitionNode') {
        return result.requisitionByNumber;
      }

      throw new Error('Record not found');
    },
  },
  update: async (
    patch: Partial<ResponseRequisitionFragment> & { id: string }
  ): Promise<{ __typename: 'RequisitionNode'; id: string }> => {
    const input = responseParser.toUpdate(patch);
    const result = await sdk.updateResponseRequisition({ storeId, input });

    const { updateResponseRequisition } = result;

    if (updateResponseRequisition.__typename === 'RequisitionNode') {
      return updateResponseRequisition;
    }

    throw new Error('Unable to update requisition');
  },
  updateLine: async (patch: DraftResponseLine) => {
    const result = await sdk.updateResponseRequisitionLine({
      storeId,
      input: responseParser.toUpdateLine(patch),
    });

    if (
      result.updateResponseRequisitionLine.__typename === 'RequisitionLineNode'
    ) {
      return result.updateResponseRequisitionLine;
    } else throw new Error('Could not update response line');
  },
});
