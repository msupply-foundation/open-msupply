import {
  RequisitionSortFieldInput,
  RequisitionsQuery,
  UpdateCustomerRequisitionInput,
  OmSupplyApi,
  ListApi,
  RequisitionListParameters,
  SortBy,
} from '@openmsupply-client/common/';
import { RequisitionRow } from '../../types';

const onRead =
  (omSupplyApi: OmSupplyApi) =>
  async (
    queryParams: RequisitionListParameters
  ): Promise<{ nodes: RequisitionRow[]; totalCount: number }> => {
    const result = await omSupplyApi.requisitions({
      params: queryParams,
    });

    const requisitions = requisitionsGuard(result);
    const { nodes } = requisitions;

    return {
      nodes: nodes.map(requisition => ({
        ...requisition,
        color: requisition?.color ?? '#8f90a6',
      })),
      totalCount: requisitions.totalCount,
    };
  };

const getSortKey = (): RequisitionSortFieldInput => {
  return RequisitionSortFieldInput.OtherPartyName;
};

const getSortDesc = (sortBy: SortBy<RequisitionRow>): boolean => {
  return !!sortBy.isDesc;
};

const requisitionsGuard = (requisitionsQuery: RequisitionsQuery) => {
  if (requisitionsQuery.requisitions.__typename === 'RequisitionConnector') {
    return requisitionsQuery.requisitions;
  }

  throw new Error('Could not fetch requisitions');
};

const onDelete =
  (api: OmSupplyApi) =>
  async (requisitions: RequisitionRow[]): Promise<string[]> => {
    const result = await api.deleteCustomerRequisitions({
      ids: requisitions.map(invoice => ({ id: invoice.id })),
    });

    const { batchCustomerRequisition } = result;
    if (batchCustomerRequisition.deleteCustomerRequisitions) {
      return batchCustomerRequisition.deleteCustomerRequisitions.map(
        ({ id }) => id
      );
    }
    throw new Error('Unknown');
  };

const requisitionToInput = (
  requisitionRow: Partial<RequisitionRow> & { id: string }
): UpdateCustomerRequisitionInput => {
  return {
    id: requisitionRow.id,
    orderDate: requisitionRow.orderDate,
    otherPartyId: requisitionRow.otherPartyId,
    comment: requisitionRow.comment,
    theirReference: requisitionRow.theirReference,
    color: requisitionRow.color,
  };
};

export const onUpdate =
  (api: OmSupplyApi) =>
  async (patch: Partial<RequisitionRow> & { id: string }): Promise<string> => {
    const result = await api.updateCustomerRequisition({
      input: requisitionToInput(patch),
    });

    const { updateCustomerRequisition } = result;

    if (updateCustomerRequisition.__typename === 'RequisitionNode') {
      return updateCustomerRequisition.id;
    }

    throw new Error('Unable to update requisition');
  };

export const onCreate =
  (api: OmSupplyApi) =>
  async (requisition: Partial<RequisitionRow>): Promise<string> => {
    const result = await api.insertCustomerRequisition({
      input: { id: requisition.id ?? '', otherPartyId: '' },
    });

    const { insertCustomerRequisition } = result;

    if (insertCustomerRequisition.__typename === 'RequisitionNode') {
      return insertCustomerRequisition.id;
    }

    throw new Error('Could not create requisition');
  };

export const getCustomerRequisitionListViewApi = (
  omSupplyApi: OmSupplyApi
): ListApi<RequisitionRow> => ({
  onRead: ({ first, offset, sortBy, filterBy }) => {
    const queryParams: RequisitionListParameters = {
      page: { first, offset },
      filter: filterBy,
      sort: [
        {
          key: getSortKey(),
          desc: getSortDesc(sortBy),
        },
      ],
    };

    const onReadFn = onRead(omSupplyApi);
    return () => onReadFn(queryParams);
  },
  onDelete: onDelete(omSupplyApi),
  onUpdate: onUpdate(omSupplyApi),
  onCreate: onCreate(omSupplyApi),
});
