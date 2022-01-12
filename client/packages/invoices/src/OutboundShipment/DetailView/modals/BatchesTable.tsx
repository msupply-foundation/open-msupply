import React from 'react';
import {
  Checkbox,
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
} from '@openmsupply-client/common';
import { BatchRow } from '../../../types';

export interface BatchesTableProps {
  onChange: (key: string, value: number, packSize: number) => void;
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

type BatchesRowProps = {
  batch: BatchRow;
  label: string;
  onChange: (key: string, value: number, packSize: number) => void;
};
const BatchesRow: React.FC<BatchesRowProps> = ({ batch, label, onChange }) => {
  const { register } = useFormContext();
  const t = useTranslation('common');
  const d = useFormatDate();

  const onChangeValue: React.ChangeEventHandler<HTMLInputElement> = event => {
    const value = Math.max(Number(event.target.value), 0);
    const newValue = Math.min(value, batch.availableNumberOfPacks);

    onChange(batch.id, newValue, batch.packSize);
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
  const isDisabled = batch.availableNumberOfPacks === 0 || batch.onHold;

  // TODO format currency correctly
  return (
    <TableRow sx={{ color: isDisabled ? 'gray.main' : 'black' }}>
      <BasicCell align="right">{label}</BasicCell>
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
      <BasicCell align="center">
        <Checkbox disabled checked={batch.onHold} />
      </BasicCell>
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
  onChange,
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

  const allocatableRows = rowsWithoutPlaceholder
    .filter(
      ({ onHold, availableNumberOfPacks }) =>
        !onHold && availableNumberOfPacks > 0
    )
    .sort(sortByExpiry);

  const nonAllocatableRows = rowsWithoutPlaceholder.filter(
    ({ onHold, availableNumberOfPacks }) =>
      onHold || availableNumberOfPacks === 0
  );

  const onHoldRows = nonAllocatableRows
    .filter(({ onHold }) => onHold)
    .sort(sortByExpiry);

  const noStockRows = nonAllocatableRows
    .filter(
      ({ availableNumberOfPacks, onHold }) =>
        availableNumberOfPacks === 0 && !onHold
    )
    .sort(sortByExpiry);

  return (
    <>
      <Divider margin={10} />
      <TableContainer sx={{ height: 375, overflowX: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <HeaderCell></HeaderCell>
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
            {allocatableRows.map((batch, index) => (
              <BatchesRow
                batch={batch}
                key={batch.id}
                label={t('label.line', { line: index + 1 })}
                onChange={onChange}
              />
            ))}
            <TableRow
              sx={{ height: 1, border: '2px solid', borderColor: 'divider' }}
            />
            {onHoldRows.map((batch, index) => (
              <BatchesRow
                batch={batch}
                key={batch.id}
                label={t('label.line', {
                  line: allocatableRows.length + index + 1,
                })}
                onChange={onChange}
              />
            ))}
            {noStockRows.map((batch, index) => (
              <BatchesRow
                batch={batch}
                key={batch.id}
                label={t('label.line', {
                  line: allocatableRows.length + onHoldRows.length + index + 1,
                })}
                onChange={onChange}
              />
            ))}

            <TableRow>
              <BasicCell align="right" sx={{ paddingTop: '3px' }}>
                {t('label.placeholder')}
              </BasicCell>
              <BasicCell sx={{ paddingTop: '3px' }}>
                <ModalNumericInput
                  value={placeholderRow?.numberOfPacks ?? 0}
                  inputProps={placeholderInputProps}
                />
              </BasicCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
