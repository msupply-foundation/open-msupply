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
  confirmedDatetime: '',
  invoiceNumber: 0,
  lines: [],
  pricing: { totalAfterTax: 0, subtotal: 0, taxPercentage: 0 },
  dispatch: null,
  hold: false,

  draftDatetime: '',
  allocatedDatetime: '',
  shippedDatetime: '',
  pickedDatetime: '',
  deliveredDatetime: '',
  otherParty: undefined,
};
