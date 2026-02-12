import { useParams } from '@openmsupply-client/common';

export const useInboundId = () => {
  const { invoiceId = '' } = useParams();
  return invoiceId;
};
