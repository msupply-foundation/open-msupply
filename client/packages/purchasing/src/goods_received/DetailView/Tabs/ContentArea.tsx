import React from 'react';
import {
  DataTable,
  NothingHere,
  useTranslation,
} from '@openmsupply-client/common';

// TODO:
// Add columns - create a useGoodsReceivedColumns hook
// Define the type for GoodsReceivedLineFragment once available
// Update Props interface accordingly

// interface ContentAreaProps {
//   lines: PurchaseOrderLineFragment[];
//   isDisabled: boolean;
//   onAddItem: () => void;
//   onRowClick: null | ((line: PurchaseOrderLineFragment) => void);
// }

// const useHighlightPlaceholderRows = (
//   rows: PurchaseOrderLineFragment[] | undefined
// ) => {
//   const { setRowStyles } = useRowStyle();

//   useEffect(() => {
//     if (!rows) return;

//     const placeholders = rows
//       .filter(row => row.requestedNumberOfUnits === 0)
//       .map(row => row.id);
//     const style: AppSxProp = {
//       color: theme => theme.palette.secondary.light,
//     };
//     setRowStyles(placeholders, style);
//   }, [rows, setRowStyles]);
// };

export const ContentArea = () => {
  const t = useTranslation();

  return (
    <DataTable
      id="goods-receiving-detail"
      onRowClick={() => {}}
      columns={[]}
      data={[]}
      enableColumnSelection
      noDataElement={
        <NothingHere
          body={t('error.no-purchase-order-items')}
          buttonText={t('button.add-item')}
        />
      }
    />
  );
};
