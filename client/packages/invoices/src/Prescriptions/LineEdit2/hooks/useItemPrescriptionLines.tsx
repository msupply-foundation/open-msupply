import {
  InvoiceLineNodeType,
  InvoiceNodeStatus,
  SortUtils,
  uniqBy,
} from '@openmsupply-client/common';
import {
  StockLineFragment,
  useHistoricalStockLines,
} from '@openmsupply-client/system';
import { PrescriptionLineFragment } from '../../api';
import { DraftPrescriptionLine } from '../../../types';
import {
  createDraftPrescriptionLine,
  createDraftPrescriptionLineFromStockLine,
} from '../../api/hooks/utils';
import { usePrescriptionLinesByItem } from '../../api/hooks/usePrescriptionLinesByItem';
import { DraftItem } from '../../..';

interface UseItemPrescriptionLines {
  initialDraftLines: DraftPrescriptionLine[];
  isLoading: boolean;
  itemDetails?: DraftItem;
}

export const useItemPrescriptionLines = ({
  itemId,
  prescriptionId,
  status,
  date,
}: {
  prescriptionId: string;
  itemId: string;
  status: InvoiceNodeStatus;
  date?: Date | null;
}): UseItemPrescriptionLines => {
  const {
    data,
    isLoading: invoiceLinesLoading,
    isFetching,
  } = usePrescriptionLinesByItem({
    itemId,
    prescriptionId,
  });

  const { data: stockLineData, isLoading: stockLinesLoading } =
    useHistoricalStockLines({
      itemId,
      datetime: date ? date.toISOString() : undefined,
    });

  const baseDraftRows = getDraftRows(
    data?.invoiceLines ?? [],
    stockLineData?.nodes ?? [],
    prescriptionId,
    status
  );

  return {
    itemDetails: data?.itemDetails,
    initialDraftLines: baseDraftRows,
    isLoading: invoiceLinesLoading || stockLinesLoading || isFetching,
  };
};

// TODO: seems unhinged, simplify
function getDraftRows(
  invoiceLines: PrescriptionLineFragment[],
  stockLines: StockLineFragment[],
  invoiceId: string,
  status: InvoiceNodeStatus
) {
  // Stock lines are coming from availableStockLines from
  // itemNode these are filtered by totalNumberOfPacks > 0 but it's possible
  // to issue all of the packs from the batch in picked status, need to make
  // sure these are not hidden
  const invoiceLineStockLines = invoiceLines.flatMap(l =>
    l.stockLine ? [l.stockLine] : []
  );
  const uniqueStockLines = uniqBy(
    [...stockLines, ...invoiceLineStockLines],
    'id'
  ).filter(stockLine => !stockLine.onHold); // Filter out on hold stock lines

  const noStockLines = uniqueStockLines.length == 0;

  if (noStockLines) {
    return [];
  }

  const rows = uniqueStockLines
    .map(batch => {
      const invoiceLine = invoiceLines?.find(
        ({ stockLine }) => stockLine?.id === batch.id
      );
      if (invoiceLine && invoiceId && status) {
        return createDraftPrescriptionLine({
          invoiceLine,
          invoiceId,
          stockLine: batch,
          invoiceStatus: status,
        });
      } else {
        return createDraftPrescriptionLineFromStockLine({
          stockLine: batch,
          invoiceId,
        });
      }
    })
    .filter(stockLine => !stockLine.location?.onHold)
    .sort(SortUtils.byExpiryAsc);

  // TODO: is this possible??
  if (status === InvoiceNodeStatus.New) {
    const placeholder = invoiceLines?.find(
      ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
    );
    // TODO: understand if needed...

    // if (!placeholder) {
    //   placeholder = draftLines.find(
    //     ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
    //   );
    // }
    // if (placeholder) {
    //   const placeholderItem = lines?.find(l => l.item.id === item.id)?.item;
    //   if (!!placeholderItem) placeholder.item = placeholderItem;

    if (placeholder)
      rows.push(
        createDraftPrescriptionLine({
          invoiceId,
          invoiceLine: placeholder,
          invoiceStatus: status,
        })
      );
    // } else {
    // Commented out for now until placeholders are implemented for
    // prescriptions
    // rows.push(createStockOutPlaceholderRow(invoiceId, item.id));
    // }
  }
  return rows;
}
