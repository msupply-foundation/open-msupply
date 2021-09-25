import React, { FC, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

import {
  Portal,
  Button,
  ColumnFormat,
  Download,
  PlusCircle,
  Printer,
  RemoteDataTable,
  useColumns,
  useHostContext,
  useNotification,
  Transaction,
  useDataTableApi,
  DropdownMenu,
  DropdownMenuItem,
  AppBarContentPortal,
  useTranslation,
  useListData,
  getNameAndColorColumn,
  Delete,
  Edit,
  TableProvider,
  createTableStore,
  getCheckboxSelectionColumn,
  ColumnDefinition,
  useTableStore,
} from '@openmsupply-client/common';

import { OutboundShipmentListViewApi } from '../../api';

const ListViewToolBar: FC<{
  onDelete: (toDelete: Transaction[]) => void;
  data?: Transaction[];
}> = ({ onDelete, data }) => {
  const t = useTranslation();

  const { success, info, warning } = useNotification();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.find(({ id }) => selectedId === id))
      .filter(Boolean) as Transaction[],
  }));

  const deleteAction = () => {
    if (selectedRows && selectedRows?.length > 0) {
      onDelete(selectedRows);
      success(`Deleted ${selectedRows?.length} invoices`)();
    } else {
      info('Select rows to delete them')();
    }
  };

  const ref = useRef(deleteAction);

  useEffect(() => {
    ref.current = deleteAction;
  }, [selectedRows]);

  return (
    <DropdownMenu label="Select">
      <DropdownMenuItem IconComponent={Delete} onClick={deleteAction}>
        {t('button.delete-lines')}
      </DropdownMenuItem>
      <DropdownMenuItem
        IconComponent={Edit}
        onClick={warning('Whats this do?')}
      >
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem
        IconComponent={Download}
        onClick={success('Successfully exported to CSV!')}
      >
        {t('button.export-to-csv')}
      </DropdownMenuItem>
    </DropdownMenu>
  );
};

export const OutboundShipmentListViewComponent: FC = () => {
  const { appBarButtonsRef } = useHostContext();
  const { info, success } = useNotification();
  const navigate = useNavigate();
  const tableApi = useDataTableApi<Transaction>();

  const {
    totalLength,
    data,
    isLoading,
    onDelete,
    onUpdate,
    sortBy,
    numberOfRows,
    onChangeSortBy,
    onChangePage,
    pagination,
  } = useListData({ key: 'color' }, 'transaction', OutboundShipmentListViewApi);

  const columns = useColumns<Transaction>([
    {
      ...getNameAndColorColumn<Transaction>((row, color) => {
        onUpdate({ ...row, color: color.hex });
      }),

      key: 'name',
      label: 'label.name',
      sortable: true,
      width: 150,
      minWidth: 200,
      maxWidth: 250,
      align: 'left',
    },
    {
      label: 'label.type',
      key: 'type',
      width: 150,
      minWidth: 150,
      maxWidth: 100,
      align: 'left',
    },
    {
      label: 'label.status',
      key: 'status',
      width: 100,
      minWidth: 100,
      maxWidth: 100,
      align: 'left',
    },
    {
      label: 'label.entered',
      key: 'entered',
      format: ColumnFormat.date,
      width: 100,
      minWidth: 100,
      maxWidth: 100,
      align: 'left',
    },
    {
      label: 'label.confirmed',
      key: 'confirmed',
      format: ColumnFormat.date,
      width: 100,
      minWidth: 100,
      maxWidth: 100,
      align: 'left',
    },

    {
      label: 'label.invoice-number',
      key: 'invoiceNumber',
      width: 75,
      minWidth: 75,
      maxWidth: 75,
      align: 'left',
    },
    {
      label: 'label.total',
      key: 'total',
      width: 75,
      minWidth: 75,
      maxWidth: 75,
      align: 'right',
    },
    {
      label: 'label.comment',
      key: 'comment',
      width: 150,
      minWidth: 150,
      maxWidth: 450,
      align: 'left',
    },
    getCheckboxSelectionColumn() as ColumnDefinition<Transaction>,
  ]);

  return (
    <>
      <AppBarContentPortal sx={{ paddingBottom: '16px' }}>
        <ListViewToolBar onDelete={onDelete} data={data} />
      </AppBarContentPortal>

      <Portal container={appBarButtonsRef?.current}>
        <>
          <Button
            shouldShrink
            icon={<PlusCircle />}
            labelKey="button.new-shipment"
            onClick={() => navigate(`/customers/customer-invoice/new`)}
          />
          <Button
            shouldShrink
            icon={<Download />}
            labelKey="button.export"
            onClick={success('Downloaded successfully')}
          />
          <Button
            shouldShrink
            icon={<Printer />}
            labelKey="button.print"
            onClick={info('No printer detected')}
          />
        </>
      </Portal>
      <RemoteDataTable
        onSortBy={onChangeSortBy}
        sortBy={sortBy}
        pagination={{ ...pagination, total: totalLength }}
        onChangePage={onChangePage}
        tableApi={tableApi}
        columns={columns}
        data={data?.slice(0, numberOfRows) || []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(`/customers/customer-invoice/${row.id}`);
        }}
      />
    </>
  );
};

export const OutboundShipmentListView: FC = () => {
  return (
    <TableProvider createStore={createTableStore}>
      <OutboundShipmentListViewComponent />
    </TableProvider>
  );
};
