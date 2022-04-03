import { useParams } from '@openmsupply-client/common';

export const useOutboundNumber = () => {
  const { invoiceNumber = '' } = useParams();
  return invoiceNumber;
};
