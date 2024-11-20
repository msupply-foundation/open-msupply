import React, { useEffect } from 'react';
import {
  AppSxProp,
  DataTable,
  NothingHere,
  useRowStyle,
  useTranslation,
} from '@openmsupply-client/common';
import { RequestLineFragment, useHideOverStocked, useRequest } from '../api';
import { isRequestLinePlaceholderRow } from '../../utils';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick: null | ((line: RequestLineFragment) => void);
}

const useHighlightPlaceholderRows = (
  rows: RequestLineFragment[] | undefined
) => {
  const { setRowStyles } = useRowStyle();

  useEffect(() => {
    if (!rows) return;

    const placeholders = rows
      .filter(isRequestLinePlaceholderRow)
      .map(row => row.id);
    const style: AppSxProp = {
      color: theme => theme.palette.secondary.light,
    };
    setRowStyles(placeholders, style);
  }, [rows, setRowStyles]);
};

export const ContentArea = ({ onAddItem, onRowClick }: ContentAreaProps) => {
  const t = useTranslation();
  const { lines, columns, itemFilter } = useRequest.line.list();
  const { on } = useHideOverStocked();
  const isDisabled = useRequest.utils.isDisabled();
  const isFiltered = !!itemFilter || on;
  useHighlightPlaceholderRows(lines);

  return (
    <DataTable
      id="internal-order-detail"
      onRowClick={onRowClick}
      columns={columns}
      data={lines}
      enableColumnSelection
      noDataElement={
        <NothingHere
          body={t(
            isFiltered
              ? 'error.no-items-filter-on'
              : 'error.no-requisition-items'
          )}
          onCreate={isDisabled ? undefined : onAddItem}
          buttonText={t('button.add-item')}
        />
      }
    />
  );
};
