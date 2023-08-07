import { useParams } from '@openmsupply-client/common';

export const usePrescriptionNumber = () => {
  const { invoiceNumber = '' } = useParams();
  return invoiceNumber;
};
