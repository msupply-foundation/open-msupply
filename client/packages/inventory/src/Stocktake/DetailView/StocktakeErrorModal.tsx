import React from 'react';
import {
  Alert,
  BasicModal,
  Box,
  DialogButton,
  Grid,
  Typography,
  AlertIcon,
  useTranslation,
} from '@openmsupply-client/common';
import {
  StocktakeLineError,
  stocktakeLineErrorMessageKey,
  useStocktakeLineErrorContext,
} from '../context';

const label = (error: StocktakeLineError): string | undefined => {
  if (error.__typename === 'StockLineReducedBelowZero') {
    const { itemName, batch, item } = error.stockLine;
    const i = item?.code ? `${item.code} ${itemName}` : itemName;
    return batch ? `${i} (${batch})` : i;
  }
  if (error.__typename === 'SnapshotCountCurrentCountMismatchLine') {
    const { itemName, batch, item } = error.stocktakeLine;
    const i = item?.code ? `${item.code} ${itemName}` : itemName;
    return batch ? `${i} (${batch})` : i;
  }
  return undefined;
};

export const StocktakeErrorModal = () => {
  const t = useTranslation();
  const { errors, stocktakeErrors, isModalOpen, closeModal } =
    useStocktakeLineErrorContext();
  const entries = Object.entries(errors).filter(
    (entry): entry is [string, StocktakeLineError] => entry[1] !== undefined
  );

  return (
    <BasicModal width={560} height={360} open={isModalOpen} onClose={closeModal}>
      <Grid container gap={1} flex={1} padding={4} flexDirection="column">
        <Grid container gap={1} flexDirection="row" alignItems="center">
          <AlertIcon color="error" />
          <Typography variant="h6">{t('heading.stocktake-errors')}</Typography>
        </Grid>
        <Typography>{t('messages.stocktake-errors-explanation')}</Typography>
        {stocktakeErrors.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {stocktakeErrors.map((message, idx) => (
              <Alert key={idx} severity="error">
                {message}
              </Alert>
            ))}
          </Box>
        )}
        <Box
          sx={{
            marginTop: 1,
            maxHeight: 240,
            overflowY: 'auto',
            border: theme => `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            display: entries.length === 0 ? 'none' : 'block',
          }}
        >
          {entries.map(([lineId, error]) => {
            return (
              <Box
                key={lineId}
                padding={2}
                sx={{
                  borderBottom: theme =>
                    `1px solid ${theme.palette.divider}`,
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                {label(error) && (
                  <Typography fontWeight="bold">{label(error)}</Typography>
                )}
                <Typography variant="body2">
                  {t(stocktakeLineErrorMessageKey(error.__typename))}
                </Typography>
              </Box>
            );
          })}
        </Box>
        <Grid
          container
          flexDirection="row"
          justifyContent="flex-end"
          marginTop={2}
        >
          <DialogButton variant="ok" onClick={closeModal} />
        </Grid>
      </Grid>
    </BasicModal>
  );
};
