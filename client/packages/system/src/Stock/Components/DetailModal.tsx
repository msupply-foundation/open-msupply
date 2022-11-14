import React, { FC } from 'react';
import {
  useTranslation,
  DetailInputWithLabelRow,
  Checkbox,
  Grid,
  Typography,
  BasicSpinner,
  DateUtils,
  Formatter,
  TextWithLabelRow,
  useFormatCurrency,
} from '@openmsupply-client/common';
import { useStock } from '../api';

interface DetailModalProps {
  id: string;
}

export const DetailModal: FC<DetailModalProps> = ({ id }) => {
  const { data, isLoading } = useStock.document.get(id);
  const t = useTranslation('inventory');
  const f = useFormatCurrency(2);

  if (isLoading) return <BasicSpinner />;

  return !!data ? (
    <Grid
      container
      paddingBottom={4}
      paddingTop={4}
      alignItems="center"
      flexDirection="column"
    >
      <Typography sx={{ fontWeight: 'bold' }} variant="h6">
        {data.item.name}
      </Typography>
      <Typography sx={{ fontWeight: 'bold' }}>
        {`${t('label.code')} : ${data.item.code}`}
      </Typography>
      <Grid
        display="flex"
        flex={1}
        container
        paddingTop={2}
        paddingBottom={2}
        width="100%"
      >
        <Grid
          container
          display="flex"
          flex={1}
          flexBasis="50%"
          flexDirection="column"
          gap={1}
        >
          <TextWithLabelRow
            label={t('label.pack-quantity')}
            text={String(data.totalNumberOfPacks)}
            textProps={{ textAlign: 'end' }}
          />
          <TextWithLabelRow
            label={t('label.cost-price')}
            text={f(data.costPricePerPack)}
            textProps={{ textAlign: 'end' }}
          />
          <TextWithLabelRow
            label={t('label.sell-price')}
            text={f(data.sellPricePerPack)}
            textProps={{ textAlign: 'end' }}
          />
          <TextWithLabelRow
            label={t('label.expiry')}
            text={
              Formatter.expiryDate(DateUtils.getDateOrNull(data.expiryDate)) ??
              ''
            }
            textProps={{ textAlign: 'end' }}
          />
          <TextWithLabelRow
            label={t('label.batch')}
            text={data.batch ? String(data.batch) : ''}
            textProps={{ textAlign: 'end' }}
          />
        </Grid>
        <Grid
          container
          display="flex"
          flex={1}
          flexBasis="50%"
          flexDirection="column"
          gap={1}
        >
          <TextWithLabelRow
            label={t('label.pack-size')}
            text={String(data.packSize)}
            textProps={{ textAlign: 'end' }}
          />
          <DetailInputWithLabelRow
            label={t('label.on-hold')}
            Input={<Checkbox checked={data.onHold} />}
          />
        </Grid>
      </Grid>
    </Grid>
  ) : null;
};
