import React, { FC } from 'react';
import { useParams } from 'react-router';
import {
  TableProvider,
  createTableStore,
  useOmSupplyApi,
  useDocument,
  useColumns,
  GenericColumnKey,
  DataTable,
  usePagination,
  useTranslation,
} from '@openmsupply-client/common';
import { reducer } from './reducer';
import { getSupplierRequisitionDetailViewApi } from './api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { isRequisitionEditable } from '../../utils';
import { SupplierRequisitionLine } from '../../types';

const useDraftSupplierRequisition = () => {
  const { id } = useParams();
  const { api } = useOmSupplyApi();

  const { draft, save, dispatch, state } = useDocument(
    ['requisition', id],
    reducer,
    getSupplierRequisitionDetailViewApi(api)
  );

  const onChangeSortBy = () => {};

  return { draft, save, dispatch, onChangeSortBy, sortBy: state.sortBy };
};

export const DetailView: FC = () => {
  const { draft, save, onChangeSortBy, sortBy } = useDraftSupplierRequisition();

  const columns = useColumns<SupplierRequisitionLine>(
    [
      ['itemCode', { width: 50 }],
      ['itemName', { width: 150 }],

      'monthlyConsumption',

      [
        'previousStockOnHand',
        {
          accessor: line =>
            `${line.previousStockOnHand} (${Math.floor(
              line.previousStockOnHand / line.monthlyConsumption
            )} months)`,
        },
      ],
      [
        'calculatedQuantity',
        {
          accessor: line => {
            const threeMonthsStock = line.monthlyConsumption * 3;
            const diff = threeMonthsStock - line.previousStockOnHand;
            if (diff > 0) {
              return `${diff.toFixed(2)} (${Math.floor(
                diff / line.monthlyConsumption
              )} months)`;
            } else {
              return 0;
            }
          },
        },
      ],
      ['forecastMethod', { accessor: () => 'AMC' }],
      'requestedQuantity',
      ['comment', { width: 150 }],
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  const { pagination } = usePagination();
  const activeRows = draft.lines.filter(({ isDeleted }) => !isDeleted);

  const t = useTranslation('common');

  return (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons
        isDisabled={!isRequisitionEditable(draft)}
        onAddItem={() => {}}
      />
      <Toolbar draft={draft} />
      <DataTable
        pagination={{ ...pagination, total: activeRows.length }}
        columns={columns}
        data={activeRows.slice(
          pagination.offset,
          pagination.offset + pagination.first
        )}
        onChangePage={pagination.onChangePage}
        noDataMessage={t('error.no-items')}
      />
      <Footer draft={draft} save={save} />
      <SidePanel draft={draft} />
    </TableProvider>
  );
};
