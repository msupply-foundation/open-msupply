import React, { FC, useCallback } from 'react';
import {
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  getNameAndColorColumn,
  useToggle,
  generateUUID,
  useNavigate,
  BasicSpinner,
  useTranslation,
  RequisitionNodeStatus,
} from '@openmsupply-client/common';
import { NameSearchModal } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import {
  RequestRequisitionRowFragment,
  useCreateRequestRequisition,
  useRequestRequisitions,
} from '../api';
import { getRequisitionTranslator } from '../../utils';

export const RequestRequisitionListView: FC = () => {
  const modalController = useToggle(false);
  const navigate = useNavigate();
  const t = useTranslation('replenishment');
  const { mutate } = useCreateRequestRequisition();
  const {
    data,
    isLoading,
    sortBy,
    onChangeSortBy,
    filter,
    pagination,
    onChangePage,
  } = useRequestRequisitions();
  const columns = useColumns<RequestRequisitionRowFragment>(
    [
      [getNameAndColorColumn(), { setter: () => {} }],
      {
        key: 'requisitionNumber',
        label: 'label.number',
      },
      [
        'status',
        {
          formatter: currentStatus =>
            getRequisitionTranslator(t)(currentStatus as RequisitionNodeStatus),
        },
      ],
      'comment',
      'selection',
    ],
    { sortBy, onChangeSortBy },
    [sortBy, onChangeSortBy]
  );

  const onRowClick = useCallback(
    (row: RequestRequisitionRowFragment) => {
      navigate(String(row.requisitionNumber));
    },
    [navigate]
  );

  if (isLoading) {
    return <BasicSpinner />;
  }

  return (
    <>
      <NameSearchModal
        type="supplier"
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async name => {
          modalController.toggleOff();
          mutate({
            id: generateUUID(),
            otherPartyId: name?.id,
          });
        }}
      />
      <Toolbar filter={filter} />
      <AppBarButtons onCreate={modalController.toggleOn} />

      <DataTable
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.nodes}
        onRowClick={onRowClick}
      />
    </>
  );
};

export const ListView: FC = () => {
  return (
    <TableProvider createStore={createTableStore}>
      <RequestRequisitionListView />
    </TableProvider>
  );
};
