import React, { useEffect } from 'react';
import {
  AppSxProp,
  DataTable,
  NothingHere,
  useRowStyle,
  useTranslation,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment } from '../../api';
import { usePurchaseOrderColumns } from '../columns';

interface ContentAreaProps {
  lines: PurchaseOrderLineFragment[];
  isDisabled: boolean;
  onAddItem: () => void;
  onRowClick: null | ((line: PurchaseOrderLineFragment) => void);
}

const useHighlightPlaceholderRows = (
  rows: PurchaseOrderLineFragment[] | undefined
) => {
  const { setRowStyles } = useRowStyle();

  useEffect(() => {
    if (!rows) return;

    const placeholders = rows
      .filter(row => row.requestedNumberOfUnits === 0)
      .map(row => row.id);
    const style: AppSxProp = {
      color: theme => theme.palette.secondary.light,
    };
    setRowStyles(placeholders, style);
  }, [rows, setRowStyles]);
};

export const ContentArea = ({
  lines,
  isDisabled,
  onAddItem,
  onRowClick,
}: ContentAreaProps) => {
  const t = useTranslation();

  useHighlightPlaceholderRows(lines);

  const { columns } = usePurchaseOrderColumns();

  return (
    <>
      <DataTable
        id="purchase-order-detail"
        onRowClick={onRowClick}
        columns={columns}
        data={lines}
        enableColumnSelection
        noDataElement={
          <NothingHere
            body={t('error.no-purchase-order-items')}
            onCreate={isDisabled ? undefined : onAddItem}
            buttonText={t('button.add-item')}
          />
        }
      />
    </>
  );
};
