import React from 'react';
import {
  useTranslation,
  NothingHere,
  MaterialTable,
  useNonPaginatedMaterialTable,
  Groupable,
} from '@openmsupply-client/common';
import { usePrescription } from '../api';
import { usePrescriptionColumn } from './columns';
import { PrescriptionLineFragment } from '../api/operations.generated';
import { isPrescriptionPlaceholderRow } from '../../utils';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?: null | ((rowData: PrescriptionLineFragment) => void);
}

export const ContentAreaComponent = ({
  onAddItem,
  onRowClick,
}: ContentAreaProps) => {
  const t = useTranslation();
  const { isDisabled, rows } = usePrescription();
  const columns = usePrescriptionColumn();

  const { table } = useNonPaginatedMaterialTable<
    Groupable<PrescriptionLineFragment>
  >({
    tableId: 'prescription-detail',
    columns,
    data: rows,
    grouping: { enabled: true },
    isLoading: false,
    initialSort: { key: 'itemName', dir: 'asc' },
    isError: false,
    onRowClick: onRowClick ? row => onRowClick(row) : undefined,
    getIsPlaceholderRow: isPrescriptionPlaceholderRow,
    noDataElement: (
      <NothingHere
        body={t('error.no-prescriptions')}
        onCreate={isDisabled ? undefined : () => onAddItem()}
        buttonText={t('button.add-item')}
      />
    ),
  });

  return <MaterialTable table={table} />;
};

export const ContentArea = React.memo(ContentAreaComponent);
