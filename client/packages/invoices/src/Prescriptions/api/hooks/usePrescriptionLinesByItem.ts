import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { PrescriptionLineFragment } from '../operations.generated';
import { PRESCRIPTION, PRESCRIPTION_LINE } from './keys';
import { useQuery } from '@openmsupply-client/common';
import { DraftItem } from '../../..';

export const usePrescriptionLinesByItem = ({
  prescriptionId,
  itemId,
}: {
  prescriptionId: string;
  itemId: string;
}) => {
  const { prescriptionApi, storeId } = usePrescriptionGraphQL();

  const queryFn = async (): Promise<{
    invoiceLines: PrescriptionLineFragment[];
    itemDetails?: DraftItem;
  }> => {
    const result = await prescriptionApi.prescriptionLinesByItem({
      invoiceId: prescriptionId,
      itemId,
      storeId,
    });

    const invoiceLines = result.invoiceLines.nodes;
    const itemDetails = result.items.nodes[0];
    return {
      invoiceLines,
      itemDetails,
    };
  };

  const query = useQuery({
    queryKey: [PRESCRIPTION, PRESCRIPTION_LINE, prescriptionId, itemId],
    queryFn,
  });

  return query;
};
