import React from 'react';
import {
  MaterialTable,
  NothingHere,
  useNonPaginatedMaterialTable,
  usePluginProvider,
  useTranslation,
} from '@openmsupply-client/common';
import { RequestLineFragment, useHideOverStocked, useRequest } from '../api';
import { isRequestLinePlaceholderRow } from '../../utils';
import { useRequestColumns } from './columns';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick: (line: RequestLineFragment) => void;
}

export const ContentArea = ({ onAddItem, onRowClick }: ContentAreaProps) => {
  const t = useTranslation();
  const { lines, itemFilter, isError, isFetching } = useRequest.line.list();
  const { on } = useHideOverStocked();
  const { plugins } = usePluginProvider();
  const isDisabled = useRequest.utils.isDisabled();
  const isFiltered = !!itemFilter || on;

  const columns = useRequestColumns();

  const { table, selectedRows } = useNonPaginatedMaterialTable({
    tableId: 'internal-order-detail',
    columns,
    data: lines,
    isLoading: isFetching,
    isError,
    getIsPlaceholderRow: isRequestLinePlaceholderRow,
    onRowClick,
    initialSort: { key: 'itemName', dir: 'asc' },
    noDataElement: (
      <NothingHere
        body={
          isFiltered
            ? t('error.no-items-filter-on')
            : t('error.no-internal-order-items')
        }
        onCreate={isDisabled ? undefined : onAddItem}
        buttonText={t('button.add-item')}
      />
    ),
  });

  return (
    <>
      {/* {plugins.requestRequisitionLine?.tableStateLoader?.map(
        (StateLoader, index) => <StateLoader key={index} requestLines={lines} />
      )} */}
      <MaterialTable table={table} />
    </>
  );
};
