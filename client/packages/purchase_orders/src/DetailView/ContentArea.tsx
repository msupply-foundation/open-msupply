import React, { useEffect } from 'react';
import {
  AppSxProp,
  DataTable,
  NothingHere,
  usePluginProvider,
  useRowStyle,
  useTranslation,
} from '@openmsupply-client/common';
import {
  PurchaseOrderLineFragment,
  // useHideOverStocked,
  // useRequest,
} from '../api';
import { usePurchaseOrderColumns } from './columns';
// import { isRequestLinePlaceholderRow } from '../../utils';

interface ContentAreaProps {
  lines: PurchaseOrderLineFragment[];
  // onAddItem: () => void;
  // onRowClick: null | ((line: PurchaseOrderLineFragment) => void);
  // manageVaccinesInDoses: boolean;
}

const useHighlightPlaceholderRows = (
  rows: PurchaseOrderLineFragment[] | undefined
) => {
  const { setRowStyles } = useRowStyle();

  useEffect(() => {
    if (!rows) return;

    const placeholders = rows
      // .filter(isRequestLinePlaceholderRow)
      .map(row => row.id);
    const style: AppSxProp = {
      color: theme => theme.palette.secondary.light,
    };
    setRowStyles(placeholders, style);
  }, [rows, setRowStyles]);
};

export const ContentArea = ({
  lines,
  // onAddItem,
  // onRowClick,
  // manageVaccinesInDoses,
}: ContentAreaProps) => {
  const t = useTranslation();
  // const { lines, columns, itemFilter } = useRequest.line.list(
  //   manageVaccinesInDoses
  // );
  // const { on } = useHideOverStocked();
  // const isDisabled = useRequest.utils.isDisabled();
  // const isFiltered = !!itemFilter || on;
  // useHighlightPlaceholderRows(lines);

  const { columns } = usePurchaseOrderColumns();

  console.log('lines:', lines);
  console.log('columns:', columns);

  return (
    <>
      <DataTable
        id="internal-order-detail"
        // onRowClick={onRowClick}
        columns={columns}
        data={lines}
        enableColumnSelection
        // noDataElement={
        //   <NothingHere
        //     body={t(
        //       isFiltered
        //         ? 'error.no-items-filter-on'
        //         : 'error.no-internal-order-items'
        //     )}
        //     onCreate={isDisabled ? undefined : onAddItem}
        //     buttonText={t('button.add-item')}
        //   />
        // }
      />
    </>
  );
};
