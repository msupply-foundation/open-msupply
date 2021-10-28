import React from 'react';
import {
  Checkbox,
  Divider,
  FieldValues,
  InfoIcon,
  isAlmostExpired,
  Item,
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
  NumericTextInput,
} from '@openmsupply-client/common';
import { BatchRow } from '../types';

export interface BatchesTableProps {
  item: Item | null;
  onChange: (key: string, value: number) => void;
  register: UseFormRegister<FieldValues>;
  rows: BatchRow[];
}

type BatchesRowProps = {
  batch: BatchRow;
  label: string;
  onChange: (key: string, value: number) => void;
};
const BatchesRow: React.FC<BatchesRowProps> = ({ batch, label, onChange }) => {
  const { register } = useFormContext();
  const t = useTranslation();
  const d = useFormatDate();

  const stockLineInputProps = register(batch.id, {
    min: { value: 1, message: t('error.greater-than-zero-required') },
    pattern: { value: /^[0-9]+$/, message: t('error.number-required') },
  });

  const onChangeValue: React.ChangeEventHandler<HTMLInputElement> = event =>
    onChange(batch.id, Number(event.target.value));

  const expiryDate = new Date(batch.expiryDate);

  // TODO format currency correctly
  return (
    <TableRow>
      <BasicCell align="right">{label}</BasicCell>
      <BasicCell sx={{ width: '88px' }}>
        <NumericTextInput
          {...stockLineInputProps}
          sx={{ height: '32px' }}
          disabled={batch.availableNumberOfPacks === 0}
          onChange={onChangeValue}
        />
      </BasicCell>
      <BasicCell>
        <Checkbox disabled={batch.availableNumberOfPacks === 0} />
      </BasicCell>
      <BasicCell align="right">{batch.totalNumberOfPacks}</BasicCell>
      <BasicCell align="right">{batch.availableNumberOfPacks}</BasicCell>
      <BasicCell align="right">{batch.packSize}</BasicCell>
      <BasicCell>{batch.batch}</BasicCell>
      <BasicCell
        sx={{ color: isAlmostExpired(expiryDate) ? 'error.main' : undefined }}
      >
        {d(expiryDate)}
      </BasicCell>
      <BasicCell align="right">${batch.costPricePerPack}</BasicCell>
      <BasicCell align="right">${batch.sellPricePerPack}</BasicCell>
      <BasicCell>
        <InfoIcon
          fontSize="small"
          sx={{ color: theme => theme.palette.lightGrey }}
        />
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
      color: theme => theme.palette.darkGrey.main,
      fontSize: '12px',
      padding: '0 8px',
      whiteSpace: 'nowrap',
      ...sx,
    }}
  />
);

export const BatchesTable: React.FC<BatchesTableProps> = ({
  item,
  onChange,
  register,
  rows,
}) => {
  if (!item) return null;

  const t = useTranslation();
  const placeholderInputProps = register('placeholder', {
    min: { value: 1, message: t('error.greater-than-zero-required') },
    pattern: { value: /^[0-9]+$/, message: t('error.number-required') },
  });

  const onChangeValue: React.ChangeEventHandler<HTMLInputElement> = event =>
    onChange('placeholder', Number(event.target.value));

  return (
    <>
      <TableContainer>
        <Divider margin={40} />
        <Table>
          <TableHead>
            <TableRow>
              <HeaderCell></HeaderCell>
              <HeaderCell>{t('label.issue')}</HeaderCell>
              <HeaderCell>{t('label.hold')}</HeaderCell>
              <HeaderCell>{t('label.available')}</HeaderCell>
              <HeaderCell>{t('label.in-store')}</HeaderCell>
              <HeaderCell>{t('label.pack')}</HeaderCell>
              <HeaderCell>{t('label.batch')}</HeaderCell>
              <HeaderCell>{t('label.expiry')}</HeaderCell>
              <HeaderCell>{t('label.cost')}</HeaderCell>
              <HeaderCell>{t('label.sell')}</HeaderCell>
              <HeaderCell></HeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((batch, index) => (
              <BatchesRow
                batch={batch}
                key={batch.id}
                label={t('label.line', { number: index + 1 })}
                onChange={onChange}
              />
            ))}
            <TableRow>
              <BasicCell align="right" sx={{ paddingTop: '3px' }}>
                {t('label.placeholder')}
              </BasicCell>
              <BasicCell sx={{ paddingTop: '3px' }}>
                <NumericTextInput
                  {...placeholderInputProps}
                  onChange={onChangeValue}
                />
              </BasicCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
