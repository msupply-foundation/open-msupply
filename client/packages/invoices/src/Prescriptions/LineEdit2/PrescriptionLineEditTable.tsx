import React from 'react';
import {
  Divider,
  Box,
  DataTable,
  useTranslation,
  Typography,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
} from '@openmsupply-client/common';
import { DraftPrescriptionLine } from '../../types';
import { DraftItem } from '../..';
import { usePrescriptionLineEditRows } from './hooks';
import { usePrescriptionLineEditColumns } from './columns';

interface PrescriptionLineEditTableProps {
  onChange: (lineId: string, unitQuantity: number) => void;
  rows: DraftPrescriptionLine[];
  item: DraftItem | null;
  isDisabled: boolean;
}

const PrescriptionLineEditTableInner = ({
  onChange,
  rows,
  item,
  isDisabled,
}: PrescriptionLineEditTableProps) => {
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

export const PrescriptionLineEditTable = ({
  onChange,
  rows,
  isDisabled,
  item,
}: PrescriptionLineEditTableProps) => {
  const t = useTranslation();

  if (!rows.length)
    return (
      <Box sx={{ margin: 'auto' }}>
        <Typography>{t('messages.no-stock-available')}</Typography>
      </Box>
    );

  return (
    <>
      <TableProvider
        createStore={createTableStore}
        queryParamsStore={createQueryParamsStore({
          initialSortBy: { key: 'expiryDate' },
        })}
      >
        <PrescriptionLineEditTableInner
          onChange={onChange}
          rows={rows}
          item={item}
          isDisabled={isDisabled}
        />
      </TableProvider>
    </>
  );
};
