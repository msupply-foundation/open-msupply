import React, { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  useQueryClient,
  Portal,
  Button,
  ColumnFormat,
  Download,
  MenuDots,
  PlusCircle,
  Printer,
  useQuery,
  RemoteDataTable,
  useColumns,
  useHostContext,
  useNotification,
  SortingRule,
  Transaction,
  useDataTableApi,
  GenericColumnType,
  DropdownMenu,
  DropdownMenuItem,
  AppBarContentPortal,
  useTranslation,
  useMutation,
  ChevronDown,
  Tools,
  getNameAndColorColumn,
  useAppBarRect,
  useWindowDimensions,
  useTheme,
} from '@openmsupply-client/common';

import { listQueryFn, deleteFn, updateFn } from '../../api';

const useListViewQueryParams = (initialSortBy: SortingRule<Transaction>[]) => {
  const { height } = useAppBarRect();
  const { height: windowHeight } = useWindowDimensions();
  const theme = useTheme();
  const { mixins } = theme;

  const dataRowHeight = mixins.table.dataRow.height;
  const headerRowHeight = mixins.table.headerRow.height;
  const paginationRowHeight = mixins.table.paginationRow.height;

  const numberOfRows = Math.floor(
    (windowHeight - (height ?? 0) - headerRowHeight - paginationRowHeight) /
      dataRowHeight
  );

  const [first, setFirst] = useState(numberOfRows);
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setFirst(numberOfRows);
    setOffset(page * numberOfRows);
  }, [numberOfRows, page]);

  return {
    first,
    offset,
    sortBy,
    page,
    setPage,
    setFirst,
    setOffset,
    setSortBy,
  };
};

export const OutboundShipmentListView: FC = () => {
  const { first, offset, sortBy, setSortBy, setPage } = useListViewQueryParams([
    { id: 'name', desc: false },
  ]);

  const { appBarButtonsRef } = useHostContext();
  const { info, success, warning } = useNotification();

  const { data: response, isLoading } = useQuery(
    ['transaction', 'list', { first, offset, sortBy }],
    () => listQueryFn({ first, offset, sortBy }),
    { keepPreviousData: true }
  );

  const queryClient = useQueryClient();

  const { mutateAsync: deleteMutateAsync } = useMutation(deleteFn, {
    onSuccess: () => queryClient.invalidateQueries(['transaction']),
  });

  const { mutateAsync } = useMutation(updateFn, {
    onMutate: patch => {
      const key = ['transaction'];
      const previousCached =
        queryClient.getQueryData<{ data: Transaction[]; totalLength: number }>(
          key
        );

      const previousData = [...(previousCached?.data ?? [])];

      const existingRowIdx = previousData.findIndex(
        ({ id }) => id === patch.id
      );
      previousData[existingRowIdx] = patch;

      queryClient.setQueryData(key, { ...previousCached, data: previousData });

      return { previousCached };
    },
    onSuccess: () => queryClient.invalidateQueries(['transaction']),
  });

  const navigate = useNavigate();
  const columns = useColumns<Transaction>([
    {
      ...getNameAndColorColumn<Transaction>((row, color) => {
        mutateAsync({ ...row, color: color.hex });
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

  const tableApi = useDataTableApi<Transaction>();
  const t = useTranslation();

  return (
    <>
      <AppBarContentPortal>
        <DropdownMenu label="Select">
          <DropdownMenuItem
            IconComponent={ChevronDown}
            onClick={() => {
              const linesToDelete = tableApi?.current?.selectedRows;
              if (linesToDelete && linesToDelete?.length > 0) {
                deleteMutateAsync(linesToDelete);
                success(`Deleted ${linesToDelete?.length} invoices`)();
              } else {
                info('Select rows to delete them')();
              }
            }}
          >
            {t('button.delete-lines')}
          </DropdownMenuItem>
          <DropdownMenuItem
            IconComponent={Tools}
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
          <Button
            shouldShrink
            icon={<MenuDots />}
            labelKey="button.more"
            onClick={warning('Do not press this button')}
          />
        </>
      </Portal>
      <RemoteDataTable
        onSortBy={(newSortBy: SortingRule<Transaction>[]) =>
          setSortBy(newSortBy)
        }
        sortBy={sortBy}
        pagination={{ first, offset, total: response?.totalLength ?? 0 }}
        onChangePage={(page: number) => setPage(page)}
        tableApi={tableApi}
        columns={columns}
        data={response?.data || []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(`/customers/customer-invoice/${row.id}`);
        }}
      />
    </>
  );
};
