import React from 'react';
import {
  Divider,
  FieldValues,
  isAlmostExpired,
  ModalNumericInput,
  Table,
  TableBody,
  TableCell,
  TableCellProps,
  TableContainer,
  TableHead,
  TableRow,
  UseFormRegister,
  useFormContext,
  useFormatDate,
  useTranslation,
  ReadOnlyInput,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { BatchRow } from '../../../types';
import { PackSizeController } from './ItemDetailsModal';

export interface BatchesTableProps {
  invoiceStatus: InvoiceNodeStatus;
  onChange: (key: string, value: number, packSize: number) => void;
  packSizeController: PackSizeController;
  register: UseFormRegister<FieldValues>;
  rows: BatchRow[];
}

export const sortByExpiry = (a: BatchRow, b: BatchRow) => {
  const expiryA = new Date(a.expiryDate ?? '');
  const expiryB = new Date(b.expiryDate ?? '');

  if (expiryA < expiryB) {
    return -1;
  }
  if (expiryA > expiryB) {
    return 1;
  }

  return 0;
};

export const sortByExpiryDesc = (a: BatchRow, b: BatchRow) => {
  const expiryA = new Date(a.expiryDate ?? '');
  const expiryB = new Date(b.expiryDate ?? '');

  if (expiryA < expiryB) {
    return 1;
  }
  if (expiryA > expiryB) {
    return -1;
  }

  return 0;
};

type BatchesRowProps = {
  batch: BatchRow;
  disabled?: boolean;
  onChange?: (key: string, value: number, packSize: number) => void;
};
const BatchesRow: React.FC<BatchesRowProps> = ({
  batch,
  disabled,
  onChange,
}) => {
  const { register } = useFormContext();
  const t = useTranslation('common');
  const d = useFormatDate();

  const onChangeValue: React.ChangeEventHandler<HTMLInputElement> = event => {
    const value = Math.max(Number(event.target.value), 0);
    const newValue = Math.min(value, batch.availableNumberOfPacks);

    onChange?.(batch.id, newValue, batch.packSize);
  };

  const stockLineInputProps = register(batch.id, {
    min: { value: 0, message: t('error.invalid-value') },
    max: {
      value: batch.availableNumberOfPacks,
      message: t('error.invalid-value'),
    },
    pattern: { value: /^[0-9]+$/, message: t('error.invalid-value') },
    onChange: onChangeValue,
  });

  const expiryDate = new Date(batch.expiryDate ?? '');
  const isDisabled = !!disabled;

  // TODO format currency correctly
  return (
    <TableRow sx={{ color: isDisabled ? 'gray.main' : 'black' }}>
      <BasicCell sx={{ width: '88px' }}>
        <ModalNumericInput
          value={batch.numberOfPacks}
          inputProps={stockLineInputProps}
          disabled={isDisabled}
        />
      </BasicCell>
      <BasicCell align="right">{batch.packSize}</BasicCell>
      <BasicCell sx={{ width: '88px' }}>
        <ReadOnlyInput
          number
          value={String(batch.numberOfPacks * batch.packSize)}
          {...register(`${batch.id}_total`)}
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
  register,
  rows,
}) => {
  const t = useTranslation(['distribution', 'common']);
  const onChangeValue: React.ChangeEventHandler<HTMLInputElement> = event =>
    onChange('placeholder', Number(event.target.value), 1);

  const placeholderInputProps = register('placeholder', {
    min: { value: 0, message: t('error.invalid-value') },
    pattern: { value: /^[0-9]+$/, message: t('error.invalid-value') },
    onChange: onChangeValue,
  });

  const placeholderRow = rows.find(({ id }) => id === 'placeholder');

  const rowsWithoutPlaceholder = rows.filter(({ id }) => id !== 'placeholder');

  const isRequestedPackSize = (packSize: number) =>
    packSizeController.selected.value === -1 ||
    packSize === packSizeController.selected.value;

  const allocatableRows = rowsWithoutPlaceholder
    .filter(
      ({ onHold, availableNumberOfPacks, packSize }) =>
        !onHold && availableNumberOfPacks > 0 && isRequestedPackSize(packSize)
    )
    .sort(sortByExpiry);

  const onHoldRows = rowsWithoutPlaceholder
    .filter(({ onHold }) => onHold)
    .sort(sortByExpiry);

  const noStockRows = rowsWithoutPlaceholder
    .filter(
      ({ availableNumberOfPacks, onHold }) =>
        availableNumberOfPacks === 0 && !onHold
    )
    .sort(sortByExpiry);

  const wrongPackSizeRows = rowsWithoutPlaceholder
    .filter(({ packSize }) => !isRequestedPackSize(packSize))
    .sort(sortByExpiry);

  return (
    <>
      <Divider margin={10} />
      <TableContainer sx={{ height: 375, overflowX: 'hidden' }}>
        <Table>
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
                <ModalNumericInput
                  value={placeholderRow?.numberOfPacks ?? 0}
                  inputProps={placeholderInputProps}
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
