import React, { FC, useState } from 'react';
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
  QueryProps,
  useDataTableApi,
  GenericColumnType,
  Dropdown,
  DropdownItem,
  AppBarContentPortal,
  useTranslation,
  useMutation,
  ChevronDown,
  Tools,
  getNameAndColorColumn,
} from '@openmsupply-client/common';

import { listQueryFn, deleteFn, updateTransactionFn } from '../../api';

export const OutboundShipmentListView: FC = () => {
  const { appBarButtonsRef } = useHostContext();
  const { info, success, warning } = useNotification();

  const [queryProps, setQueryProps] = useState<QueryProps<Transaction>>({
    first: 10,
    offset: 0,
  });
  const { data: response, isLoading } = useQuery(
    ['transaction', 'list', queryProps],
    () => listQueryFn(queryProps),
    { notifyOnChangeProps: ['data'] }
  );

  const queryClient = useQueryClient();

  const { mutateAsync: deleteMutateAsync } = useMutation(deleteFn, {
    onSuccess: () => queryClient.invalidateQueries(['transaction']),
  });

  const { mutateAsync } = useMutation(updateTransactionFn, {
    onMutate: patch => {
      const key = ['transaction', 'list', queryProps];
      const previousCached =
        queryClient.getQueryData<{ data: Transaction[]; totalLength: number }>(
          key
        );

      const previousData = [...(previousCached?.data ?? [])];

      const existingRowIdx = previousData.findIndex(
        ({ id }) => id === patch.id
      );
      previousData[existingRowIdx] = patch;

      queryClient.setQueryData(key, { ...previousData, data: previousData });

      return { previousCached };
    },
    onSuccess: () => queryClient.invalidateQueries(['transaction']),
  });

  const navigate = useNavigate();
  const columns = useColumns<Transaction>(
    [
      {
        ...getNameAndColorColumn<Transaction>((row, color) => {
          mutateAsync({ ...row, color: color.hex });
        }),

        key: 'customer',
        label: 'label.customer',
        sortable: false,
      },
      {
        label: 'label.id',
        key: 'id',
        sortable: false,
      },
      { label: 'label.date', key: 'date', format: ColumnFormat.date },
      { label: 'label.customer', key: 'customer' },
      { label: 'label.supplier', key: 'supplier' },
      { label: 'label.total', key: 'total' },
      GenericColumnType.Selection,
    ],
    []
  );

  const initialSortBy: SortingRule<Transaction>[] = [
    { id: 'date', desc: true },
  ];

  const tableApi = useDataTableApi<Transaction>();
  const t = useTranslation();

  return (
    <>
      <AppBarContentPortal>
        <Dropdown label="Select">
          <DropdownItem
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
          </DropdownItem>
          <DropdownItem
            IconComponent={Tools}
            onClick={warning('Whats this do?')}
          >
            Edit
          </DropdownItem>
          <DropdownItem
            IconComponent={Download}
            onClick={success('Successfully exported to CSV!')}
          >
            {t('button.export-to-csv')}
          </DropdownItem>
        </Dropdown>
      </AppBarContentPortal>

      <Portal container={appBarButtonsRef?.current}>
        <>
          <Button
            icon={<PlusCircle />}
            labelKey="button.new-shipment"
            onClick={() => navigate(`/customers/customer-invoice/new`)}
          />
          <Button
            icon={<Download />}
            labelKey="button.export"
            onClick={success('Downloaded successfully')}
          />
          <Button
            icon={<Printer />}
            labelKey="button.print"
            onClick={info('No printer detected')}
          />
          <Button
            icon={<MenuDots />}
            labelKey="button.more"
            onClick={warning('Do not press this button')}
          />
        </>
      </Portal>
      <RemoteDataTable
        tableApi={tableApi}
        columns={columns}
        data={response?.data || []}
        initialSortBy={initialSortBy}
        isLoading={isLoading}
        onFetchData={setQueryProps}
        onRowClick={row => {
          navigate(`/customers/customer-invoice/${row.id}`);
        }}
        totalLength={response?.totalLength || 0}
      />
    </>
  );
};
