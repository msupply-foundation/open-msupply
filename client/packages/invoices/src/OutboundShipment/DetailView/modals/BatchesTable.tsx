import React from 'react';
import {
  NumericTextInput,
  Divider,
  isAlmostExpired,
  Table,
  TableBody,
  TableCell,
  TableCellProps,
  TableContainer,
  TableHead,
  TableRow,
  useFormatDate,
  useTranslation,
  ReadOnlyInput,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { DraftOutboundLine } from '../../../types';
import { PackSizeController } from './hooks';
import { sortByExpiry } from './utils';
export interface BatchesTableProps {
  invoiceStatus: InvoiceNodeStatus;
  onChange: (key: string, value: number, packSize: number) => void;
  packSizeController: PackSizeController;
  rows: DraftOutboundLine[];
}

type BatchesRowProps = {
  batch: DraftOutboundLine;
  disabled?: boolean;
  onChange?: (key: string, value: number, packSize: number) => void;
};
const BatchesRow: React.FC<BatchesRowProps> = ({
  batch,
  disabled,
  onChange,
}) => {
  const d = useFormatDate();

  const expiryDate = new Date(batch.expiryDate ?? '');
  const isDisabled = !!disabled;

  // TODO format currency correctly
  return (
    <TableRow sx={{ color: isDisabled ? 'gray.main' : 'black' }}>
      <BasicCell sx={{ width: '88px' }}>
        <NumericTextInput
          onChange={event => {
            const value = Math.max(Number(event.target.value), 0);
            const newValue = Math.min(value, batch.availableNumberOfPacks);
            onChange?.(batch.id, newValue, batch.packSize);
          }}
          value={batch.numberOfPacks}
          disabled={isDisabled}
        />
      </BasicCell>
      <BasicCell align="right">{batch.packSize}</BasicCell>
      <BasicCell sx={{ width: '88px' }}>
        <ReadOnlyInput
          number
          value={String(batch.numberOfPacks * batch.packSize)}
        />
      </BasicCell>
      <BasicCell align="right">{batch.availableNumberOfPacks}</BasicCell>
      <BasicCell align="right">{batch.totalNumberOfPacks}</BasicCell>
      <BasicCell>{batch.batch}</BasicCell>
      <BasicCell
        sx={{ color: isAlmostExpired(expiryDate) ? 'error.main' : 'inherit' }}
      >
        {d(expiryDate)}
      </BasicCell>
      <BasicCell>{batch.locationName}</BasicCell>
      <BasicCell align="right">${batch.sellPricePerPack}</BasicCell>
      <BasicCell align="center">{batch.onHold ? '✓' : ''}</BasicCell>
    </TableRow>
  );
};

const HeaderCell: React.FC<TableCellProps> = ({ children }) => (
  <BasicCell
    sx={{
      color: theme => theme.typography.body1.color,
      fontWeight: 'bold',
      padding: '8px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      backgroundColor: 'white',
    }}
  >
    {children}
  </BasicCell>
);

const BasicCell: React.FC<TableCellProps> = ({ sx, ...props }) => (
  <TableCell
    {...props}
    sx={{
      borderBottomWidth: 0,
      color: 'inherit',
      fontSize: '12px',
      padding: '0 8px',
      whiteSpace: 'nowrap',
      ...sx,
    }}
  />
);

export const BatchesTable: React.FC<BatchesTableProps> = ({
  invoiceStatus,
  onChange,
  packSizeController,
  rows,
}) => {
  const t = useTranslation(['distribution', 'common']);

  const placeholderRow = rows.find(({ id }) => id === 'placeholder');

  const rowsWithoutPlaceholder = rows
    .filter(({ id }) => id !== 'placeholder')
    .sort(sortByExpiry);

  const isRequestedPackSize = (packSize: number) =>
    packSizeController.selected.value === -1 ||
    packSize === packSizeController.selected.value;

  const allocatableRows: DraftOutboundLine[] = [];
  const onHoldRows: DraftOutboundLine[] = [];
  const noStockRows: DraftOutboundLine[] = [];
  const wrongPackSizeRows: DraftOutboundLine[] = [];

  rowsWithoutPlaceholder.forEach(row => {
    if (row.onHold) {
      onHoldRows.push(row);
      return;
    }

    if (row.availableNumberOfPacks === 0) {
      noStockRows.push(row);
      return;
    }

    if (!isRequestedPackSize(row.packSize)) {
      wrongPackSizeRows.push(row);
      return;
    }

    allocatableRows.push(row);
  });

  return (
    <>
      <Divider margin={10} />
      <TableContainer sx={{ height: 375, overflowX: 'hidden' }}>
        <Table style={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}>
          <TableHead>
            <TableRow>
              <HeaderCell>{t('label.num-packs')}</HeaderCell>
              <HeaderCell>{t('label.pack')}</HeaderCell>
              <HeaderCell>{t('label.unit-quantity')}</HeaderCell>
              <HeaderCell>{t('label.available')}</HeaderCell>
              <HeaderCell>{t('label.in-store')}</HeaderCell>
              <HeaderCell>{t('label.batch')}</HeaderCell>
              <HeaderCell>{t('label.expiry')}</HeaderCell>
              <HeaderCell>{t('label.location')}</HeaderCell>
              <HeaderCell>{t('label.sell')}</HeaderCell>
              <HeaderCell>{t('label.on-hold')}</HeaderCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ overflowY: 'scroll' }}>
            {allocatableRows.map(batch => (
              <BatchesRow batch={batch} key={batch.id} onChange={onChange} />
            ))}
            <TableRow
              sx={{ height: 1, border: '2px solid', borderColor: 'divider' }}
            />
            {wrongPackSizeRows.map(batch => (
              <BatchesRow batch={batch} key={batch.id} disabled />
            ))}
            {onHoldRows.map(batch => (
              <BatchesRow batch={batch} key={batch.id} disabled />
            ))}
            {noStockRows.map(batch => (
              <BatchesRow batch={batch} key={batch.id} disabled />
            ))}
            <TableRow>
              <BasicCell align="right" sx={{ paddingTop: '3px' }}>
                {t('label.placeholder')}
              </BasicCell>
              <BasicCell sx={{ paddingTop: '3px' }}>
                <NumericTextInput
                  onChange={event => {
                    onChange('placeholder', Number(event.target.value), 1);
                  }}
                  value={placeholderRow?.numberOfPacks ?? 0}
                  disabled={invoiceStatus !== InvoiceNodeStatus.New}
                />
              </BasicCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
