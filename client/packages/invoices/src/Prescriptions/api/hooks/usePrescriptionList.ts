import {
  FilterByWithBoolean,
  InvoiceNodeType,
  InvoiceSortFieldInput,
  SortBy,
  useQuery,
} from '@openmsupply-client/common';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { LIST, PRESCRIPTION } from './keys';
import { PrescriptionRowFragment } from '../operations.generated';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<PrescriptionRowFragment>;
  filterBy: FilterByWithBoolean | null;
};

const sortFieldMap: Record<string, InvoiceSortFieldInput> = {
  createdDateTime: InvoiceSortFieldInput.CreatedDatetime,
  prescriptionDatetime: InvoiceSortFieldInput.InvoiceDatetime,
  otherPartyName: InvoiceSortFieldInput.OtherPartyName,
  comment: InvoiceSortFieldInput.Comment,
  invoiceNumber: InvoiceSortFieldInput.InvoiceNumber,
  status: InvoiceSortFieldInput.Status,
};

export const usePrescriptionList = (queryParams: ListParams) => {
  const { prescriptionApi, storeId } = usePrescriptionGraphQL();

  const {
    sortBy = {
      key: 'name',
      direction: 'asc',
    },
    first,
    offset,
    filterBy,
  } = queryParams;

  const queryKey = [
    PRESCRIPTION,
    storeId,
    LIST,
    sortBy,
    first,
    offset,
    filterBy,
  ];

  const queryFn = async (): Promise<{
    nodes: PrescriptionRowFragment[];
    totalCount: number;
  }> => {
    const filter = {
      ...filterBy,
      type: { equalTo: InvoiceNodeType.Prescription },
    };

    const query = await prescriptionApi.prescriptions({
      storeId,
      first: first,
      offset: offset,
      key: sortFieldMap[sortBy.key] ?? InvoiceSortFieldInput.Status,
      desc: sortBy.isDesc,
      filter,
    });
    const { nodes, totalCount } = query?.invoices;
    return { nodes, totalCount };
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
};
