import React, { useEffect } from 'react';
import {
  AppSxProp,
  DataTable,
  NothingHere,
  useRowStyle,
  useTranslation,
} from '@openmsupply-client/common';
import { GoodsReceivedLineFragment } from '../../api/operations.generated';
import { useGoodsReceivedColumns } from '../columns';

interface ContentAreaProps {
  lines: GoodsReceivedLineFragment[];
  isDisabled: boolean;
  onRowClick: null | ((line: GoodsReceivedLineFragment) => void);
}

const useHighlightPlaceholderRows = (
  rows: GoodsReceivedLineFragment[] | undefined
) => {
  const { setRowStyles } = useRowStyle();

  useEffect(() => {
    if (!rows) return;

    const placeholders = rows
      .filter(row => row.numberOfPacksReceived === 0)
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
  onRowClick,
}: ContentAreaProps) => {
  const t = useTranslation();

  useHighlightPlaceholderRows(lines);

  const { columns } = useGoodsReceivedColumns();

  return (
    <DataTable
      id="goods-receiving-detail"
      onRowClick={onRowClick}
      columns={columns}
      data={lines}
      enableColumnSelection
      noDataElement={
        <NothingHere
          body={t('error.no-purchase-order-items')}
          buttonText={t('button.add-item')}
          onCreate={isDisabled ? undefined : undefined}
        />
      }
    />
  );
};
