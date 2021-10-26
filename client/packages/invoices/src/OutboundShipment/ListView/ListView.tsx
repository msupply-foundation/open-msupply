import React, { FC, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  DownloadIcon,
  PlusCircleIcon,
  PrinterIcon,
  DataTable,
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

  const { success, info } = useNotification();

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
    </DropdownMenu>
  );
};

export const OutboundShipmentListViewComponent: FC = () => {
  const { info, success } = useNotification();
  const navigate = useNavigate();

  const {
    totalCount,
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
  } = useListData({ key: 'TYPE' }, 'invoice', OutboundShipmentListViewApi);

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
      'entryDatetime',
      'confirmedDatetime',
      'comment',
      ['total', { accessor: invoice => invoice.pricing.totalAfterTax }],
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
            navigate(`/distribution/outbound-shipment/${result.id}`);
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

      <DataTable
        pagination={{ ...pagination, total: totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.slice(0, numberOfRows) || []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(`/distribution/outbound-shipment/${row.id}`);
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
