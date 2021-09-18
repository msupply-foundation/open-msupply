import React, { FC } from 'react';
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
  GenericColumnType,
  DropdownMenu,
  DropdownMenuItem,
  AppBarContentPortal,
  useTranslation,
  Edit,
  Delete,
  getNameAndColorColumn,
  useListData,
} from '@openmsupply-client/common';

import { OutboundShipmentListViewApi } from '../../api';

export const OutboundShipmentListView: FC = () => {
  const { appBarButtonsRef } = useHostContext();
  const { info, success, warning } = useNotification();
  const navigate = useNavigate();
  const tableApi = useDataTableApi<Transaction>();
  const t = useTranslation();

  const {
    data,
    totalLength,
    isLoading,
    onDelete,
    onUpdate,
    first,
    offset,
    sortBy,
    numberOfRows,
    onChangeSortBy,
    onChangePage,
  } = useListData('color', 'transaction', OutboundShipmentListViewApi);

  const columns = useColumns<Transaction>([
    {
      ...getNameAndColorColumn<Transaction>((row, color) => {
        onUpdate({ ...row, color: color.hex });
      }),

      key: 'name',
      label: 'label.name',
      sortable: false,
      width: 150,
      minWidth: 150,
      maxWidth: 250,
      align: 'left',
    },
    {
      label: 'label.type',
      key: 'type',
      width: 100,
      minWidth: 100,
      maxWidth: 100,
      align: 'left',
    },
    {
      label: 'label.status',
      key: 'status',
      width: 75,
      minWidth: 75,
      maxWidth: 75,
      align: 'left',
    },
    {
      label: 'label.entered',
      key: 'entered',
      format: ColumnFormat.date,
      width: 75,
      minWidth: 75,
      maxWidth: 75,
      align: 'left',
    },
    {
      label: 'label.confirmed',
      key: 'confirmed',
      format: ColumnFormat.date,
      width: 75,
      minWidth: 75,
      maxWidth: 75,
      align: 'left',
    },

    {
      label: 'label.invoice-number',
      key: 'invoiceNumber',
      width: 25,
      minWidth: 25,
      maxWidth: 25,
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
      minWidth: 300,
      maxWidth: 450,
      align: 'left',
    },
    GenericColumnType.Selection,
  ]);

  return (
    <>
      <AppBarContentPortal sx={{ paddingBottom: '16px' }}>
        <DropdownMenu label="Select">
          <DropdownMenuItem
            IconComponent={Delete}
            onClick={() => {
              const linesToDelete = tableApi?.current?.selectedRows;

              if (linesToDelete && linesToDelete?.length > 0) {
                onDelete(linesToDelete);
                success(`Deleted ${linesToDelete?.length} invoices`)();
              } else {
                info('Select rows to delete them')();
              }
            }}
          >
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
        pagination={{ first, offset, total: totalLength ?? 0 }}
        onChangePage={(page: number) => onChangePage(page)}
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
