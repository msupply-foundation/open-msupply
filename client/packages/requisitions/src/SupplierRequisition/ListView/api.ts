import {
  RequisitionSortFieldInput,
  RequisitionsQuery,
  UpdateSupplierRequisitionInput,
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

    return { nodes, totalCount: requisitions.totalCount };
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
    const result = await api.deleteSupplierRequisitions({
      ids: requisitions.map(invoice => ({ id: invoice.id })),
    });
    const { batchSupplierRequisition } = result;
    if (batchSupplierRequisition.deleteSupplierRequisitions) {
      return batchSupplierRequisition.deleteSupplierRequisitions.map(
        ({ id }) => id
      );
    }
    throw new Error('Unknown');
  };

const requisitionToInput = (
  requisitionRow: RequisitionRow
): UpdateSupplierRequisitionInput => {
  return {
    ...requisitionRow,
  };
};

export const onUpdate =
  (api: OmSupplyApi) =>
  async (patch: Partial<RequisitionRow> & { id: string }): Promise<string> => {
    const result = await api.updateSupplierRequisition({
      input: requisitionToInput(patch),
    });

    const { updateSupplierRequisition } = result;

    if (updateSupplierRequisition.__typename === 'RequisitionNode') {
      return updateSupplierRequisition.id;
    }

    throw new Error('Unable to update requisition');
  };

export const onCreate =
  (api: OmSupplyApi) =>
  async (requisition: Partial<RequisitionRow>): Promise<string> => {
    const result = await api.insertSupplierRequisition({
      input: { id: requisition.id ?? '', otherPartyId: '' },
    });

    const { insertSupplierRequisition } = result;

    if (insertSupplierRequisition.__typename === 'RequisitionNode') {
      return insertSupplierRequisition.id;
    }

    throw new Error('Could not create requisition');
  };

export const getSupplierRequisitionListViewApi = (
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
