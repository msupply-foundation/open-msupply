import React, { FC, useEffect } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  getNameAndColorColumn,
  useTableStore,
  RequisitionNodeStatus,
  useTranslation,
  NothingHere,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getRequisitionTranslator, isResponseDisabled } from '../../utils';
import { useUpdateResponse, useResponses, ResponseRowFragment } from '../api';

const useDisableResponseRows = (rows?: ResponseRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows?.filter(isResponseDisabled).map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

export const ResponseRequisitionListView: FC = () => {
  const { mutate: onUpdate } = useUpdateResponse();
  const navigate = useNavigate();
  const t = useTranslation('distribution');
  const {
    data,
    isError,
    isLoading,
    onChangeSortBy,
    sortBy,
    onChangePage,
    pagination,
    filter,
  } = useResponses();
  useDisableResponseRows(data?.nodes);

  const columns = useColumns<ResponseRowFragment>(
    [
      [getNameAndColorColumn(), { setter: onUpdate }],
      {
        key: 'requisitionNumber',
        label: 'label.number',
        width: 100,
      },
      'createdDatetime',
      [
        'status',
        {
          formatter: status =>
            getRequisitionTranslator(t)(status as RequisitionNodeStatus),
        },
      ],
      ['comment', { minWidth: 400 }],
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons sortBy={sortBy} />

      <DataTable
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.nodes}
        onRowClick={row => {
          navigate(String(row.requisitionNumber));
        }}
        isError={isError}
        isLoading={isLoading}
        noDataElement={<NothingHere body={t('error.no-requisitions')} />}
      />
    </>
  );
};

export const ListView: FC = () => {
  return (
    <TableProvider createStore={createTableStore}>
      <ResponseRequisitionListView />
    </TableProvider>
  );
};
