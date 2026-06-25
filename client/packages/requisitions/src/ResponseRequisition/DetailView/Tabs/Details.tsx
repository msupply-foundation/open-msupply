import React, { useCallback } from 'react';
import {
  MaterialTable,
  ModalMode,
  NothingHere,
  useNonPaginatedMaterialTable,
  useTranslation,
  useAuthContext,
} from '@openmsupply-client/common';
import { ResponseLineFragment, useResponse } from '../../api';
import { useResponseColumns } from '../columns';
import { isResponseLinePlaceholderRow } from '../../../utils';
import { Footer } from '../Footer';
import { ResponseLineEditModal } from '../ResponseLineEdit';
import { useResponseLines } from '../../api/hooks/line/useResponseLines';

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
  const { data, isFetching, isError } = useResponse.document.get();
  const { lines } = useResponseLines();
  const { columns } = useResponseColumns();
  const isDisabled = useResponse.utils.isDisabled();

  const onRowClick = useCallback(
    (line: ResponseLineFragment) => lineEdit.onOpen(line.item.id),
    [lineEdit]
  );

  const { table, selectedRows } = useNonPaginatedMaterialTable({
    tableId: 'response-requisition-detail',
    columns,
    data: lines,
    isLoading: isFetching,
    isError,
    getIsPlaceholderRow: row => isResponseLinePlaceholderRow(row.original),
    onRowClick,
    initialSort: { key: 'itemName', dir: 'asc' },
    noDataElement: (
      <NothingHere
        body={t('error.no-requisition-items')}
        onCreate={isDisabled ? undefined : () => lineEdit.onOpen()}
        buttonText={t('button.add-item')}
      />
    ),
  });

  return (
    <>
      <MaterialTable table={table} />
      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
      {lineEdit.isOpen && data && (
        <ResponseLineEditModal
          requisition={data}
          itemId={lineEdit.entity}
          store={store}
          mode={lineEdit.mode}
          isOpen={lineEdit.isOpen}
          onClose={lineEdit.onClose}
        />
      )}
    </>
  );
};
