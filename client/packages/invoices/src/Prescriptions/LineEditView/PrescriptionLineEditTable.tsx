import React from 'react';
import {
  Divider,
  Box,
  DataTable,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftStockOutLine } from '../../types';
import { DraftItem } from '../..';
import { usePrescriptionLineEditRows } from './hooks';
import { usePrescriptionLineEditColumns } from './columns';

export interface PrescriptionLineEditTableProps {
  onChange: (key: string, value: number) => void;
  rows: DraftStockOutLine[];
  item: DraftItem | null;
  allocatedUnits: number;
  batch?: string;
  isDisabled: boolean;
}

export const PrescriptionLineEditTable: React.FC<
  PrescriptionLineEditTableProps
> = ({ onChange, rows, item, isDisabled }) => {
  const t = useTranslation();
  const { orderedRows } = usePrescriptionLineEditRows(rows, isDisabled);
  const onEditStockLine = (key: string, value: number) => {
    const num = Number.isNaN(value) ? 0 : value;
    onChange(key, num);
  };
  const unit = item?.unitName ?? t('label.unit');

  const columns = usePrescriptionLineEditColumns({
    onChange: onEditStockLine,
    unit,
  });

  return (
    <Box style={{ width: '100%' }}>
      <Divider margin={10} />
      <Box
        style={{
          maxHeight: 300,
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        {!!orderedRows.length && (
          <DataTable
            id="prescription-line-edit"
            columns={columns}
            data={orderedRows}
            dense
          />
        )}
      </Box>
    </Box>
  );
};
