import React from 'react';
import {
  Checkbox,
  Divider,
  FieldValues,
  Grid,
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
  ReadOnlyInput,
  Popper,
} from '@openmsupply-client/common';
import { BatchRow } from '../types';

export interface BatchesTableProps {
  item: Item | null;
  onChange: (key: string, value: number, packSize: number) => void;
  register: UseFormRegister<FieldValues>;
  rows: BatchRow[];
}

type BatchesRowProps = {
  batch: BatchRow;
  label: string;
  onChange: (key: string, value: number, packSize: number) => void;
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
    onChange(batch.id, Number(event.target.value), batch.packSize);

  const expiryDate = new Date(batch.expiryDate);
  const isDisabled = batch.availableNumberOfPacks === 0 || batch.onHold;

  // TODO format currency correctly
  return (
    <TableRow>
      <BasicCell align="right">{label}</BasicCell>
      <BasicCell sx={{ width: '88px' }}>
        <NumericTextInput
          {...stockLineInputProps}
          sx={{ height: '32px' }}
          disabled={isDisabled}
          onChange={onChangeValue}
        />
      </BasicCell>
      <BasicCell align="right">{batch.packSize}</BasicCell>
      <BasicCell sx={{ width: '88px' }}>
        <ReadOnlyInput number {...register(`${batch.id}_total`)} />
      </BasicCell>
      <BasicCell align="right">{batch.availableNumberOfPacks}</BasicCell>
      <BasicCell align="right">{batch.totalNumberOfPacks}</BasicCell>
      <BasicCell>{batch.batch}</BasicCell>
      <BasicCell
        sx={{ color: isAlmostExpired(expiryDate) ? 'error.main' : undefined }}
      >
        {d(expiryDate)}
      </BasicCell>
      <BasicCell>{batch.location}</BasicCell>
      <BasicCell align="right">${batch.sellPricePerPack}</BasicCell>
      <BasicCell align="center">
        <Checkbox disabled checked={batch.onHold} />
      </BasicCell>
      <BasicCell>
        <Popper
          content={
            <Grid
              spacing={2}
              container
              sx={{ fontSize: '12px', padding: '20px' }}
            >
              <Grid item>
                {batch.totalNumberOfPacks - batch.availableNumberOfPacks} packs
                are allocated to other shipments.
              </Grid>
              <Grid item>
                <Grid container>
                  <Grid container justifyContent="space-between">
                    <Grid item>Invoice #xxxx</Grid>
                    <Grid item>
                      {`${
                        (batch.totalNumberOfPacks -
                          batch.availableNumberOfPacks) /
                        2
                      } packs`}
                    </Grid>
                  </Grid>
                  <Grid container justifyContent="space-between">
                    <Grid item>Invoice #yyyy</Grid>
                    <Grid item>
                      {`${
                        (batch.totalNumberOfPacks -
                          batch.availableNumberOfPacks) /
                        2
                      } packs`}
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          }
          placement="left"
          width={250}
        >
          <InfoIcon
            fontSize="small"
            sx={{ color: theme => theme.palette.lightGrey, cursor: 'help' }}
          />
        </Popper>
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
    onChange('placeholder', Number(event.target.value), 1);

  return (
    <>
      <TableContainer>
        <Divider margin={40} />
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
