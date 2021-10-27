import { OutboundShipment } from './types';
export { DetailView } from './DetailView';

export const placeholderInvoice: OutboundShipment = {
  id: '',
  otherPartyName: '',
  total: '',
  comment: '',
  theirReference: '',
  color: 'grey',
  status: 'draft',
  type: '',
  entryDatetime: '',
  confirmedDatetime: '',
  invoiceNumber: '',
  lines: [],
  pricing: { totalAfterTax: 0 },
  dispatch: null,
  hold: false,
  name: {
    id: '',
    name: '',
    code: '',
    isCustomer: true,
    isSupplier: false,
  },
};
