import React from 'react';
import {
  useNavigate,
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  ColumnAlign,
  TooltipTextCell,
  CellProps,
  UnitsAndMaybeDoses,
  NumberCell,
} from '@openmsupply-client/common';
import { useVisibleOrOnHandItems, ItemsWithStatsFragment } from '../api';
import { Toolbar } from './Toolbar';

const ItemListComponent = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const {
    updatePaginationQuery,
    updateSortQuery,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({
    filters: [
      { key: 'codeOrName' },
      { key: 'hasStockOnHand', condition: '=' },
      { key: 'minMonthsOfStock', condition: 'isNumber' },
      { key: 'maxMonthsOfStock', condition: 'isNumber' },
      { key: 'stockStatus' },
      { key: 'productsAtRiskOfBeingOutOfStock', condition: '=' },
    ],
  });

  const queryParams = {
    sortBy,
    first,
    offset,
    filterBy: { ...filterBy },
  };

  const { data, isError, isLoading } = useVisibleOrOnHandItems(queryParams);
  const pagination = { page, first, offset };

  const columns = useColumns<ItemsWithStatsFragment>(
    [
      ['code', { width: 75 }],
      [
        'name',
        {
          Cell: TooltipTextCell,
          maxWidth: 350,
        },
      ],
      {
        key: 'packUnit',
        label: 'label.unit',
        align: ColumnAlign.Right,
        accessor: ({ rowData }) => rowData.unitName,
        width: 130,
        sortable: false,
      },
      [
        'stockOnHand',
        {
          accessor: ({ rowData }) => rowData.stats.stockOnHand,
          Cell: UnitsAndMaybeDosesCell,
          width: 180,
          sortable: false,
        },
      ],
      [
        'monthlyConsumption',
        {
          Cell: UnitsAndMaybeDosesCell,
          accessor: ({ rowData }) => rowData.stats.averageMonthlyConsumption,

          align: ColumnAlign.Right,
          width: 180,
          sortable: false,
        },
      ],
      {
        Cell: NumberCell,
        accessor: ({ rowData }) => rowData.stats.monthsOfStockOnHand ?? 0,
        align: ColumnAlign.Right,
        description: 'description.months-of-stock',
        key: 'monthsOfStockOnHand',
        label: 'label.months-of-stock',
        sortable: false,
        width: 120,
      },
    ],
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy]
  );

  return (
    <>
      <Toolbar />
      <DataTable
        id="item-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isError={isError}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(`/catalogue/items/${row.id}`);
        }}
        noDataElement={<NothingHere body={t('error.no-items-to-display')} />}
      />
    </>
  );
};

export const ItemListView = () => (
  <TableProvider createStore={createTableStore}>
    <ItemListComponent />
  </TableProvider>
);

const UnitsAndMaybeDosesCell = (props: CellProps<ItemsWithStatsFragment>) => {
  const { rowData, column } = props;
  const units = Number(column.accessor({ rowData })) ?? 0;
  const { isVaccine, doses } = rowData;

  return (
    <UnitsAndMaybeDoses
      numberCellProps={props}
      units={units}
      isVaccine={isVaccine}
      dosesPerUnit={doses}
    />
  );
};
