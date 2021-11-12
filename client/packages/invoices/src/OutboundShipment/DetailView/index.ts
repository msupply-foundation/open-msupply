import { OutboundShipment } from './types';
export { DetailView } from './DetailView';

export const placeholderInvoice: OutboundShipment = {
  id: '',
  otherPartyName: '',
  total: '',
  comment: '',
  theirReference: '',
  color: 'grey',
  status: 'DRAFT',
  type: '',
  entryDatetime: '',
  invoiceNumber: 0,
  lines: [],
  pricing: { totalAfterTax: 0, subtotal: 0, taxPercentage: 0 },
  dispatch: null,
  onHold: false,

  allocatedDatetime: '',
  shippedDatetime: '',
  pickedDatetime: '',
  deliveredDatetime: '',

  purchaseOrderNumber: undefined,
  goodsReceiptNumber: undefined,
  requisitionNumber: undefined,
  inboundShipmentNumber: undefined,

  transportReference: undefined,
  shippingMethod: undefined,

  otherParty: undefined,

  enteredByName: '',
};
