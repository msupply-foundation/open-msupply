import React, { FC, useMemo } from 'react';
import {
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  Box,
  DataTable,
  MiniTable,
  SortUtils,
  ArrayUtils,
} from '@openmsupply-client/common';
import { usePrescriptionSingle } from '../api';
import { usePrescriptionColumn } from './columns';
import { useExpansionColumns } from './PrescriptionLineEdit/columns';
import { StockOutItem } from '../../types';
import { StockOutLineFragment } from '../../StockOut';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?: null | ((rowData: StockOutLineFragment | StockOutItem) => void);
}

const Expand: FC<{
  rowData: StockOutLineFragment | StockOutItem;
}> = ({ rowData }) => {
  const expandoColumns = useExpansionColumns();

  if ('lines' in rowData && rowData.lines.length > 1) {
    return <MiniTable rows={rowData.lines} columns={expandoColumns} />;
  } else {
    return null;
  }
};

export const ContentAreaComponent: FC<ContentAreaProps> = ({
  onAddItem,
  onRowClick,
}) => {
  const t = useTranslation();
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const {
    query: { data },
    isDisabled,
  } = usePrescriptionSingle();
  const columns = usePrescriptionColumn({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });

  if (!data) return;

  const rows = useMemo(() => {
    const stockLines = data?.lines?.nodes;
    const items = Object.entries(
      ArrayUtils.groupBy(stockLines, line => line.item.id)
    ).map(([itemId, lines]) => {
      return { id: itemId, itemId, lines };
    });
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return items;
    const sorter = SortUtils.getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return [...(items ?? [])].sort(sorter);
  }, [data, sortBy.key, sortBy.isDesc]);

  return (
    <Box flexDirection="column" display="flex" flex={1}>
      <DataTable
        id="prescription-detail"
        onRowClick={onRowClick}
        ExpandContent={Expand}
        columns={columns}
        data={rows}
        enableColumnSelection
        noDataElement={
          <NothingHere
            body={t('error.no-prescriptions')}
            onCreate={isDisabled ? undefined : () => onAddItem()}
            buttonText={t('button.add-item')}
          />
        }
        isRowAnimated={true}
      />
    </Box>
  );
};

export const ContentArea = React.memo(ContentAreaComponent);
