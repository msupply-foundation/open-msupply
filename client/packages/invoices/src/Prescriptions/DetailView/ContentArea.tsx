import React from 'react';
import {
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  DataTable,
  MiniTable,
} from '@openmsupply-client/common';
import { usePrescription } from '../api';
import { usePrescriptionColumn } from './columns';
import { StockOutItem } from '../../types';
import { StockOutLineFragment } from '../../StockOut';
import { useExpansionColumns } from './columns';
import { ItemRowFragment } from 'packages/system/src';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?: null | ((rowData: StockOutLineFragment | StockOutItem) => void);
  item?: ItemRowFragment;
  displayInDoses?: boolean;
}

const Expand = ({
  rowData,
  displayInDoses,
}: {
  rowData: StockOutLineFragment | StockOutItem;
  displayInDoses?: boolean;
}) => {
  if ('lines' in rowData && rowData.lines.length > 1) {
    const isVaccineItem = rowData.lines[0]?.item.isVaccine ?? false;
    return (
      <ExpandoInner
        rowData={rowData}
        withDoseColumns={displayInDoses && isVaccineItem}
      />
    );
  } else {
    return null;
  }
};

const ExpandoInner = ({
  rowData,
  withDoseColumns,
}: {
  rowData: StockOutLineFragment | StockOutItem;
  withDoseColumns?: boolean;
}) => {
  const expandoColumns = useExpansionColumns(withDoseColumns);
  if ('lines' in rowData && rowData.lines.length > 1) {
    return <MiniTable rows={rowData.lines} columns={expandoColumns} />;
  } else {
    return null;
  }
};

export const ContentAreaComponent = ({
  onAddItem,
  onRowClick,
  displayInDoses,
}: ContentAreaProps) => {
  const t = useTranslation();
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const { isDisabled, rows } = usePrescription();
  const columns = usePrescriptionColumn({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });

  if (!rows) return null;

  return (
    <DataTable
      id="prescription-detail"
      onRowClick={onRowClick}
      columns={columns}
      data={rows}
      enableColumnSelection
      ExpandContent={props => (
        <Expand {...props} displayInDoses={displayInDoses} />
      )}
      noDataElement={
        <NothingHere
          body={t('error.no-prescriptions')}
          onCreate={isDisabled ? undefined : () => onAddItem()}
          buttonText={t('button.add-item')}
        />
      }
      isRowAnimated={true}
    />
  );
};

export const ContentArea = React.memo(ContentAreaComponent);
