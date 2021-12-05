import { SupplierRequisitionNodeStatus } from '@openmsupply-client/common';

import { Requisition, SupplierRequisition, CustomerRequisition } from './types';

export const placeholderSupplierRequisition: SupplierRequisition = {
  id: '',
  requisitionNumber: 0,
  isDeleted: false,
  lines: [],
  color: '#cdcdcd',
  otherParty: {
    id: '',
    name: '',
    code: '',
    isCustomer: false,
    isSupplier: true,
  },
  otherPartyId: '',
  otherPartyName: '',
  status: SupplierRequisitionNodeStatus.Draft,
  orderDate: null,
  requisitionDate: null,
  update: () => {
    throw new Error(
      'Placeholder callback update has been triggered. This should never happen!'
    );
  },
  updateOtherParty: () => {
    throw new Error(
      'Placeholder callback updateOtherParty has been triggered. This should never happen!'
    );
  },
};

export const placeholderCustomerRequisition: CustomerRequisition = {
  id: '',
  requisitionNumber: 0,
  isDeleted: false,
  lines: [],
  color: '#cdcdcd',
  otherParty: {
    id: '',
    name: '',
    code: '',
    isCustomer: false,
    isSupplier: true,
  },
  otherPartyId: '',
  otherPartyName: '',
  status: SupplierRequisitionNodeStatus.Draft,
  orderDate: null,
  requisitionDate: null,
  update: () => {
    throw new Error(
      'Placeholder callback update has been triggered. This should never happen!'
    );
  },
  updateOtherParty: () => {
    throw new Error(
      'Placeholder callback updateOtherParty has been triggered. This should never happen!'
    );
  },
  updateRequisitionDate: () => {
    throw new Error(
      'Placeholder callback updateRequisitionDate has been triggered. This should never happen!'
    );
  },
  updateOrderDate: () => {
    throw new Error(
      'Placeholder callback updateOrderDate has been triggered. This should never happen!'
    );
  },
};

export const isRequisitionEditable = (requisition: Requisition): boolean => {
  return (
    requisition.status === SupplierRequisitionNodeStatus.Draft ||
    requisition.status === SupplierRequisitionNodeStatus.InProgress
  );
};

// TODO: When supplier requisition statuses are finalised, this function should be passed
// `t` and should properly translate the status.
export const getSupplierRequisitionTranslator =
  () =>
  (currentStatus: SupplierRequisitionNodeStatus): string =>
    currentStatus;

// TODO: When supplier requisition statuses are finalised, this function should
// return the next status rather than just returning the current status
export const getNextSupplierRequisitionStatus = (
  currentStatus: SupplierRequisitionNodeStatus
): SupplierRequisitionNodeStatus => {
  return currentStatus;
};

export const getSupplierRequisitionStatuses =
  (): SupplierRequisitionNodeStatus[] => [
    SupplierRequisitionNodeStatus.Draft,
    SupplierRequisitionNodeStatus.InProgress,
    SupplierRequisitionNodeStatus.Finalised,
    SupplierRequisitionNodeStatus.Sent,
  ];
