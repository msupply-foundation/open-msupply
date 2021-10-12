import { OutboundShipment } from './types';
export { OutboundShipmentDetailView } from './DetailView';

export const placeholderTransaction: OutboundShipment = {
  id: '',
  otherPartyName: '',
  total: '',
  comment: '',
  color: 'grey',
  status: '',
  type: '',
  entered: '',
  confirmed: '',
  invoiceNumber: '',
  lines: [],
  dispatch: null,
};
