import React, { useEffect } from 'react';
import {
  AppSxProp,
  DataTable,
  NothingHere,
  usePluginProvider,
  useRowStyle,
  useTranslation,
} from '@openmsupply-client/common';
import { RequestLineFragment, useHideOverStocked, useRequest } from '../api';
import { isRequestLinePlaceholderRow } from '../../utils';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick: null | ((line: RequestLineFragment) => void);
  manageVaccinesInDoses: boolean;
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

export const ContentArea = ({
  onAddItem,
  onRowClick,
  manageVaccinesInDoses,
}: ContentAreaProps) => {
  const t = useTranslation();
  const { lines, columns, itemFilter } = useRequest.line.list(
    manageVaccinesInDoses
  );
  const { on } = useHideOverStocked();
  const { plugins } = usePluginProvider();
  const isDisabled = useRequest.utils.isDisabled();
  const isFiltered = !!itemFilter || on;
  useHighlightPlaceholderRows(lines);

  return (
    <>
      {plugins.requestRequisitionLine?.tableStateLoader?.map(
        (StateLoader, index) => <StateLoader key={index} requestLines={lines} />
      )}
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
                : 'error.no-internal-order-items'
            )}
            onCreate={isDisabled ? undefined : onAddItem}
            buttonText={t('button.add-item')}
          />
        }
      />
    </>
  );
};
