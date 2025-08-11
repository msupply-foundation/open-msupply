import {
  PurchaseOrderNodeStatus,
  PurchaseOrderNodeType,
  RecordPatch,
} from '@common/types';
import { setNullableInput } from '@common/utils';
import { PurchaseOrderFragment } from '../operations.generated';

export const mapStatus = (
  status?: PurchaseOrderNodeStatus
): PurchaseOrderNodeType | undefined => {
  switch (status) {
    case PurchaseOrderNodeStatus.New:
      return PurchaseOrderNodeType.New;
    case PurchaseOrderNodeStatus.Authorised:
      return PurchaseOrderNodeType.Authorised;
    case PurchaseOrderNodeStatus.Confirmed:
      return PurchaseOrderNodeType.Confirmed;
    case PurchaseOrderNodeStatus.Finalised:
      return PurchaseOrderNodeType.Finalised;
    default:
      return undefined;
  }
};

export const parseUpdateInput = (input: RecordPatch<PurchaseOrderFragment>) => {
  const { supplier, donor } = input;
  return {
    id: input.id,
    supplierId: supplier?.id,
    status: mapStatus(input.status),
    donorId: setNullableInput('id', donor),
    // Form fields from Details tab
    authorisingOfficer1: input.authorisingOfficer1,
    authorisingOfficer2: input.authorisingOfficer2,
    additionalInstructions: input.additionalInstructions,
    supplierAgent: input.supplierAgent,
    headingMessage: input.headingMessage,
    freightConditions: input.freightConditions,
    agentCommission: input.agentCommission,
    documentCharge: input.documentCharge,
    communicationsCharge: input.communicationsCharge,
    insuranceCharge: input.insuranceCharge,
    freightCharge: input.freightCharge,
    // Supplier section fields
    supplierDiscountPercentage: input.supplierDiscountPercentage,
    currencyId: input.currencyId,
    foreignExchangeRate: input.foreignExchangeRate,
    // Other fields
    reference: input.reference,
    comment: input.comment,
    shippingMethod: input.shippingMethod,
    targetMonths: input.targetMonths,
    // Date fields
    confirmedDatetime: setNullableInput('confirmedDatetime', input),
    contractSignedDate: setNullableInput('contractSignedDate', input),
    advancePaidDate: setNullableInput('advancePaidDate', input),
    receivedAtPortDate: setNullableInput('receivedAtPortDate', input),
    sentDatetime: setNullableInput('sentDatetime', input),
    requestedDeliveryDate: setNullableInput('requestedDeliveryDate', input),
  };
};
