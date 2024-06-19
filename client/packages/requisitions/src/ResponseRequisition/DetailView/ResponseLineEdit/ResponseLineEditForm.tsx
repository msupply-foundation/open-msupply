import React from 'react';
import {
  Box,
  Grid,
  InputWithLabelRow,
  NumericTextInput,
  TextArea,
  Tooltip,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftResponseLine } from './hooks';
import { VariantControl } from '@openmsupply-client/system';

interface ResponseLineEditFormProps {
  disabled: boolean;
  update: (patch: Partial<DraftResponseLine>) => void;
  draftLine: DraftResponseLine;
  variantsControl?: VariantControl;
  numberOfPacksFromQuantity: (totalQuantity: number) => number;
  numberOfPacksToTotalQuantity: (numPacks: number) => number;
}

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <Grid spacing={4} container direction="row">
      <Grid xs={2} item>
        <Typography variant="body1" fontWeight={700}>
          {label}
        </Typography>
      </Grid>
      <Grid xs={2} item>
        <Typography
          variant="body1"
          sx={{
            width: '220px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </Typography>
      </Grid>
    </Grid>
  );
};

interface ResponseLineEditFormLayoutProps {
  Left: React.ReactElement;
  Middle: React.ReactElement;
  Right: React.ReactElement;
}

export const ResponseLineEditFormLayout = ({
  Left,
  Middle,
  Right,
}: ResponseLineEditFormLayoutProps) => {
  return (
    <Grid
      container
      spacing={2}
      direction="row"
      justifyContent="space-between"
      bgcolor="background.toolbar"
      padding={4}
      paddingBottom={2}
    >
      <Grid item xs={4}>
        {Left}
      </Grid>
      <Grid item xs={4}>
        {Middle}
      </Grid>
      <Grid item xs={4}>
        {Right}
      </Grid>
    </Grid>
  );
};

export const ResponseLineEditForm = ({
  disabled,
  update,
  draftLine,
  variantsControl,
  numberOfPacksFromQuantity,
  numberOfPacksToTotalQuantity,
}: ResponseLineEditFormProps) => {
  const t = useTranslation('distribution');
  const supplyQuantity = draftLine.supplyQuantity ?? 0;

  const { item } = draftLine;

  return (
    <ResponseLineEditFormLayout
      Left={
        <>
          <Typography variant="body1" fontWeight="bold">
            {t('heading.stock-details')}
          </Typography>
          <Tooltip title={item.name}>
            <Box>
              <InfoRow label={t('label.name')} value={item.name} />
            </Box>
          </Tooltip>
          <InfoRow label={t('label.code')} value={item.code} />
          {variantsControl ? (
            <InfoRow
              label={t('label.pack')}
              value={variantsControl.activeVariant.longName}
            />
          ) : item.unitName ? (
            <InfoRow label={t('label.unit')} value={item.unitName} />
          ) : null}
        </>
      }
      Middle={
        <>
          <Typography variant="body1" fontWeight="bold">
            {t('heading.order')}
          </Typography>
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={150}
                value={numberOfPacksFromQuantity(draftLine.requestedQuantity)}
                disabled
              />
            }
            labelWidth="150px"
            labelProps={{ sx: { fontWeight: 500 } }}
            label={t('label.requested-quantity')}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                disabled={disabled}
                autoFocus
                value={numberOfPacksFromQuantity(supplyQuantity)}
                width={150}
                onChange={q =>
                  update({
                    supplyQuantity: q && numberOfPacksToTotalQuantity(q),
                  })
                }
              />
            }
            labelWidth="150px"
            labelProps={{ sx: { fontWeight: 500 } }}
            label={t('label.supply-quantity')}
          />
        </>
      }
      Right={
        <>
          <Typography variant="body1" fontWeight="bold">
            {t('heading.comment')}
          </Typography>
          <TextArea
            value={draftLine.comment ?? ''}
            onChange={e => update({ comment: e.target.value })}
            InputProps={{
              sx: { backgroundColor: theme => theme.palette.background.menu },
            }}
          />
        </>
      }
    />
  );
};
