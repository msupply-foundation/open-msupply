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
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getRequisitionTranslator, isResponseDisabled } from '../../utils';
import { useResponse, ResponseRowFragment } from '../api';

const useDisableResponseRows = (rows?: ResponseRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows?.filter(isResponseDisabled).map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

export const ResponseRequisitionListView: FC = () => {
  const { mutate: onUpdate } = useResponse.document.update();
  const navigate = useNavigate();
  const t = useTranslation('distribution');
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const { data, isError, isLoading } = useResponse.document.list();
  const pagination = { page, first, offset };
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
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons sortBy={sortBy} />

      <DataTable
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
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
