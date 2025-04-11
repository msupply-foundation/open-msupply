import { useParams } from '@openmsupply-client/common';

export const useOutboundId = () => {
  const { invoiceId = '' } = useParams();
  return invoiceId;
};
