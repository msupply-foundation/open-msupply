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
  invoiceNumber: '',
  lines: [],
  pricing: { totalAfterTax: 0 },
  dispatch: null,
  hold: false,

  draftDatetime: '',
  allocatedDatetime: '',
  shippedDatetime: '',
  pickedDatetime: '',
  deliveredDatetime: '',

  name: {
    id: '',
    name: '',
    code: '',
    isCustomer: true,
    isSupplier: false,
  },
};
