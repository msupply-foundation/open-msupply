import React, { useCallback } from 'react';
import {
  MaterialTable,
  ModalMode,
  NothingHere,
  useNonPaginatedMaterialTable,
  useTranslation,
  usePluginProvider,
  useAuthContext,
} from '@openmsupply-client/common';
import { RequestLineFragment, useHideOverStocked, useRequest } from '../../api';
import { useRequestColumns } from '../columns';
import { isRequestLinePlaceholderRow } from '../../../utils';
import { Footer } from '../Footer';
import { RequestLineEditModal } from '../RequestLineEdit';

export interface DetailsTabLineEdit {
  isOpen: boolean;
  mode: ModalMode | null;
  entity: string | null;
  onOpen: (entity?: string | null) => void;
  onClose: () => void;
}

interface DetailsTabProps {
  /**
   * Line-edit modal state lives in `DetailView` so the `AppBarButtons` "Add
   * Item" control (rendered outside this tab) can also open it. The modal
   * itself is rendered here so it stays scoped to the tab that owns the lines
   * table — see the matching pattern in InboundShipment.
   */
  lineEdit: DetailsTabLineEdit;
}

export const DetailsTab = ({ lineEdit }: DetailsTabProps) => {
  const t = useTranslation();
  const { store } = useAuthContext();
  const { data } = useRequest.document.get();
  const isDisabled = useRequest.utils.isDisabled();
  const { lines, itemFilter, isError, isFetching } = useRequest.line.list();
  const { on } = useHideOverStocked();
  const { plugins } = usePluginProvider();
  const isFiltered = !!itemFilter || on;

  const columns = useRequestColumns();

  const onRowClick = useCallback(
    (line: RequestLineFragment) => lineEdit.onOpen(line.item.id),
    [lineEdit]
  );

  const { table, selectedRows } = useNonPaginatedMaterialTable({
    tableId: 'internal-order-detail',
    columns,
    data: lines,
    isLoading: isFetching,
    isError,
    getIsPlaceholderRow: row => isRequestLinePlaceholderRow(row.original),
    onRowClick,
    initialSort: { key: 'itemName', dir: 'asc' },
    manualFiltering: true,
    noDataElement: (
      <NothingHere
        body={
          isFiltered
            ? t('error.no-items-filter-on')
            : t('error.no-internal-order-items')
        }
        onCreate={isDisabled ? undefined : () => lineEdit.onOpen()}
        buttonText={t('button.add-item')}
      />
    ),
  });

  const getSortedItems = useCallback(
    () =>
      table
        .getSortedRowModel()
        .rows.reduce<RequestLineFragment['item'][]>((acc, row) => {
          const item = row.original?.item;
          if (item && !acc.some(i => i?.id === item.id)) acc.push(item);
          return acc;
        }, []),
    [table]
  );

  return (
    <>
      {plugins.requestRequisitionLine?.tableStateLoader?.map(
        (StateLoader, index) =>
          data ? (
            <StateLoader
              key={index}
              requestLines={lines}
              requisition={data}
            />
          ) : null
      )}
      <MaterialTable table={table} />
      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
      {lineEdit.isOpen && data && (
        <RequestLineEditModal
          requisition={data}
          itemId={lineEdit.entity}
          isOpen={lineEdit.isOpen}
          onClose={lineEdit.onClose}
          mode={lineEdit.mode}
          store={store}
          getSortedItems={getSortedItems}
        />
      )}
    </>
  );
};
