import React, { FC, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

import {
  Button,
  Download,
  PlusCircle,
  Printer,
  RemoteDataTable,
  useColumns,
  useNotification,
  Transaction,
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
  useTableStore,
  ColumnSetBuilder,
  Color,
  AppBarButtonsPortal,
  Book,
} from '@openmsupply-client/common';

import { OutboundShipmentListViewApi } from '../../api';
import { ExternalURL } from '@openmsupply-client/config';

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
  const { info, success } = useNotification();
  const navigate = useNavigate();

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

  const onColorUpdate = (row: Transaction, color: Color) => {
    onUpdate({ ...row, color: color.hex });
  };

  const columns = useColumns(
    new ColumnSetBuilder<Transaction>()
      .addColumn(getNameAndColorColumn(onColorUpdate))
      .addColumn('type')
      .addColumn('status')
      .addColumn('invoiceNumber')
      .addColumn('confirmed')
      .addColumn('entered')
      .addColumn('total')
      .addColumn('comment')
      .addColumn('selection')
      .build(),
    { onChangeSortBy }
  );

  return (
    <>
      <AppBarContentPortal sx={{ paddingBottom: '16px' }}>
        <ListViewToolBar onDelete={onDelete} data={data} />
      </AppBarContentPortal>

      <AppBarButtonsPortal>
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
        <Button
          shouldShrink
          icon={<Book />}
          labelKey="button.docs"
          onClick={() => (location.href = ExternalURL.PublicDocs)}
        />
      </AppBarButtonsPortal>

      <RemoteDataTable
        sortBy={sortBy}
        pagination={{ ...pagination, total: totalLength }}
        onChangePage={onChangePage}
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
