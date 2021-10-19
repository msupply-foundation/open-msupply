import { OutboundShipment } from './types';
export { OutboundShipmentDetailView } from './DetailView';

export const placeholderInvoice: OutboundShipment = {
  id: '',
  otherPartyName: '',
  total: '',
  comment: '',
  theirReference: '',
  color: 'grey',
  status: 'draft',
  type: '',
  entered: '',
  confirmed: '',
  invoiceNumber: '',
  lines: [],
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
