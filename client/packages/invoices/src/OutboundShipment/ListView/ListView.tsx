import React, { FC, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  DownloadIcon,
  PlusCircleIcon,
  PrinterIcon,
  RemoteDataTable,
  useColumns,
  useNotification,
  Invoice,
  DropdownMenu,
  DropdownMenuItem,
  AppBarContentPortal,
  useTranslation,
  useListData,
  getNameAndColorColumn,
  DeleteIcon,
  EditIcon,
  TableProvider,
  createTableStore,
  useTableStore,
  Color,
  AppBarButtonsPortal,
  BookIcon,
  ButtonWithIcon,
  Grid,
  OutboundShipmentStatus,
} from '@openmsupply-client/common';

import { OutboundShipmentListViewApi } from '../../api';
import { ExternalURL } from '@openmsupply-client/config';
import { CustomerSearch } from './CustomerSearch';
import { getStatusTranslation } from '../utils';

const ListViewToolBar: FC<{
  onDelete: (toDelete: Invoice[]) => void;
  data?: Invoice[];
}> = ({ onDelete, data }) => {
  const t = useTranslation();

  const { success, info, warning } = useNotification();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.find(({ id }) => selectedId === id))
      .filter(Boolean) as Invoice[],
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
      <DropdownMenuItem IconComponent={DeleteIcon} onClick={deleteAction}>
        {t('button.delete-lines')}
      </DropdownMenuItem>
      <DropdownMenuItem
        IconComponent={EditIcon}
        onClick={warning('Whats this do?')}
      >
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem
        IconComponent={DownloadIcon}
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
    onCreate,
    onChangePage,
    pagination,
    invalidate,
  } = useListData({ key: 'color' }, 'invoice', OutboundShipmentListViewApi);

  const onColorUpdate = (row: Invoice, color: Color) => {
    onUpdate({ ...row, color: color.hex });
  };

  const columns = useColumns<Invoice>(
    [
      getNameAndColorColumn(onColorUpdate),
      [
        'status',
        {
          formatter: (status, { t }) =>
            t(getStatusTranslation(status as OutboundShipmentStatus)),
        },
      ],
      'invoiceNumber',
      'entered',
      'confirmed',
      'total',
      'comment',
      'selection',
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  const [open, setOpen] = useState(false);

  return (
    <>
      <CustomerSearch
        open={open}
        onClose={() => setOpen(false)}
        onChange={async name => {
          setOpen(false);

          const createInvoice = async () => {
            const invoice = {
              id: String(Math.ceil(Math.random() * 1000000)),
              nameId: name?.id,
            };

            const result = await onCreate(invoice);

            invalidate();
            navigate(`/customers/customer-invoice/${result.invoiceNumber}`);
          };

          createInvoice();
        }}
      />
      <AppBarContentPortal sx={{ paddingBottom: '16px' }}>
        <ListViewToolBar onDelete={onDelete} data={data} />
      </AppBarContentPortal>

      <AppBarButtonsPortal>
        <Grid container gap={1}>
          <ButtonWithIcon
            Icon={<PlusCircleIcon />}
            labelKey="button.new-shipment"
            onClick={() => setOpen(true)}
          />
          <ButtonWithIcon
            Icon={<DownloadIcon />}
            labelKey="button.export"
            onClick={success('Downloaded successfully')}
          />
          <ButtonWithIcon
            Icon={<PrinterIcon />}
            labelKey="button.print"
            onClick={info('No printer detected')}
          />
          <ButtonWithIcon
            Icon={<BookIcon />}
            labelKey="button.docs"
            onClick={() => (location.href = ExternalURL.PublicDocs)}
          />
        </Grid>
      </AppBarButtonsPortal>

      <RemoteDataTable
        pagination={{ ...pagination, total: totalLength }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.slice(0, numberOfRows) || []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(`/customers/customer-invoice/${row.invoiceNumber}`);
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
