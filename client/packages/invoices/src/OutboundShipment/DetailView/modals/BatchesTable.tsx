import React, { ChangeEventHandler } from 'react';
import {
  Checkbox,
  Divider,
  FieldValues,
  InfoIcon,
  InvoiceLine,
  Item,
  StockLine,
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
import { getInvoiceLine } from './ItemDetailsModal';

export interface BatchesTableProps {
  item: Item | null;
  onChange: (invoiceLine: InvoiceLine) => void;
  register: UseFormRegister<FieldValues>;
  rows: BatchRow[];
}

type BatchRowProps = {
  batch: BatchRow;
  label: string;
  onChangeLine: (line: StockLine, quantity: number) => void;
};
const BatchRow: React.FC<BatchRowProps> = ({ batch, label, onChangeLine }) => {
  const { register } = useFormContext();
  const t = useTranslation();
  const d = useFormatDate();

  const onChange: ChangeEventHandler<HTMLInputElement> = event =>
    onChangeLine(batch, Number(event.target.value));

  const stockLineInputProps = register(batch.id, {
    min: { value: 1, message: t('error.greater-than-zero-required') },
    pattern: { value: /^[0-9]+$/, message: t('error.number-required') },
  });

  // TODO format currency correctly
  return (
    <TableRow>
      <BasicCell align="right">{label}</BasicCell>
      <BasicCell sx={{ width: '88px' }}>
        <NumericTextInput
          {...stockLineInputProps}
          sx={{ height: '32px' }}
          onChange={onChange}
          disabled={batch.availableNumberOfPacks === 0}
        />
      </BasicCell>
      <BasicCell>
        <Checkbox disabled={batch.availableNumberOfPacks === 0} />
      </BasicCell>
      <BasicCell align="right">{batch.totalNumberOfPacks}</BasicCell>
      <BasicCell align="right">{batch.availableNumberOfPacks}</BasicCell>
      <BasicCell align="right">{batch.packSize}</BasicCell>
      <BasicCell>{batch.batch}</BasicCell>
      <BasicCell>{d(new Date(batch.expiryDate))}</BasicCell>
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

  const changeLine = (line: StockLine, quantity: number) =>
    onChange(getInvoiceLine('', item, line, quantity));
  const changePlaceholderQuantity: ChangeEventHandler<HTMLInputElement> =
    event => {
      onChange(
        getInvoiceLine(
          'placeholder',
          item,
          {
            id: 'placeholder',
            expiryDate: '',
          },
          Number(event.target.value)
        )
      );
    };

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
              <BatchRow
                batch={batch}
                key={batch.id}
                label={t('label.line', { number: index + 1 })}
                onChangeLine={changeLine}
              />
            ))}
            <TableRow>
              <BasicCell align="right" sx={{ paddingTop: '3px' }}>
                {t('label.placeholder')}
              </BasicCell>
              <BasicCell sx={{ paddingTop: '3px' }}>
                <NumericTextInput
                  {...placeholderInputProps}
                  onChange={changePlaceholderQuantity}
                />
              </BasicCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
