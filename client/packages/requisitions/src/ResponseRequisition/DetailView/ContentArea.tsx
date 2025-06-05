import React, { useEffect } from 'react';
import {
  AppSxProp,
  DataTable,
  NothingHere,
  useRowStyle,
  useTranslation,
} from '@openmsupply-client/common';
import { useResponse, ResponseLineFragment } from '../api';
import { isResponseLinePlaceholderRow } from '../../utils';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick: null | ((line: ResponseLineFragment) => void);
  disableAddLine: boolean;
  manageVaccinesInDoses?: boolean;
}

const useHighlightPlaceholderRows = (
  rows: ResponseLineFragment[] | undefined
) => {
  const { setRowStyles } = useRowStyle();

  useEffect(() => {
    if (!rows) return;

    const placeholders = rows
      .filter(isResponseLinePlaceholderRow)
      .map(row => row.id);
    const style: AppSxProp = {
      color: theme => theme.palette.secondary.light,
    };
    setRowStyles(placeholders, style);
  }, [rows, setRowStyles]);
};

export const ContentArea = ({
  onRowClick,
  onAddItem,
  disableAddLine,
  manageVaccinesInDoses = false,
}: ContentAreaProps) => {
  const t = useTranslation();
  const { columns, lines } = useResponse.line.list(manageVaccinesInDoses);
  useHighlightPlaceholderRows(lines);

  return (
    <DataTable
      id="requisition-detail"
      onRowClick={onRowClick}
      columns={columns}
      data={lines}
      noDataElement={
        <NothingHere
          body={t('error.no-requisition-items')}
          buttonText={t('button.add-item')}
          onCreate={disableAddLine ? undefined : onAddItem}
        />
      }
    />
  );
};
