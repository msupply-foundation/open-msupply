import React from 'react';
import {
  BasicTextInput,
  Item,
  StockLine,
  Table,
  TableBody,
  TableCell,
  TableCellProps,
  TableContainer,
  TableHead,
  TableRow,
  useFormContext,
  useFormatDate,
  useTranslation,
  Checkbox,
  Divider,
} from '@openmsupply-client/common';

export interface ItemBatchesProps {
  item: Item | null;
}

const BatchRow = ({ batch, label }: { batch: StockLine; label: string }) => {
  const { register } = useFormContext();
  const t = useTranslation();
  const d = useFormatDate();

  const stockLineInputProps = register(batch.id, {
    min: { value: 1, message: t('error.greater-than-zero-required') },
    pattern: { value: /^[0-9]+$/, message: t('error.number-required') },
  });

  // TODO format currency correctly
  return (
    <TableRow>
      <BasicCell align="right">{label}</BasicCell>
      <BasicCell sx={{ width: '88px' }}>
        <BasicTextInput
          {...stockLineInputProps}
          sx={{ height: '32px' }}
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
      <BasicCell>I</BasicCell>
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
      color: theme => theme.palette.darkGrey,
      fontSize: '12px',
      padding: '0 8px',
      whiteSpace: 'nowrap',
      ...sx,
    }}
  />
);

export const ItemBatches: React.FC<ItemBatchesProps> = ({ item }) => {
  if (!item) return null;

  const t = useTranslation();
  const { register } = useFormContext();
  const placeholderInputProps = register('placeholder', {
    min: { value: 1, message: t('error.greater-than-zero-required') },
    pattern: { value: /^[0-9]+$/, message: t('error.number-required') },
  });

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
            {item.availableBatches.nodes.map((batch, index) => (
              <BatchRow
                batch={batch}
                key={batch.id}
                label={t('label.line', { number: index + 1 })}
              />
            ))}
            <TableRow>
              <BasicCell align="right" sx={{ paddingTop: '3px' }}>
                {t('label.placeholder')}
              </BasicCell>
              <BasicCell sx={{ paddingTop: '3px' }}>
                <BasicTextInput {...placeholderInputProps} />
              </BasicCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
