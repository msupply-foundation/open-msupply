import React from 'react';
import { Alert, Box, useTranslation } from '@openmsupply-client/common';
import {
  stocktakeLineErrorMessageKey,
  useStocktakeLineErrorContext,
} from '../../../context';
import { DraftStocktakeLine } from './utils';

interface StocktakeLineErrorBannerProps {
  draftLines: DraftStocktakeLine[];
}

export const StocktakeLineEditErrorBanner = ({ draftLines }: StocktakeLineErrorBannerProps) => {
  const t = useTranslation();
  const { errors } = useStocktakeLineErrorContext();

  const visibleErrors = draftLines.flatMap(line => {
    const error = errors[line.id];
    return error ? [{ line, error }] : [];
  });

  if (visibleErrors.length === 0) return null;

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 1 }}
    >
      {visibleErrors.map(({ line, error }) => (
        <Alert
          data-testid="stocktake-line-error"
          key={line.id}
          severity="error"
        >
          {line.batch ? `${line.batch}: ` : ''}
          {t(stocktakeLineErrorMessageKey(error.__typename))}
        </Alert>
      ))}
    </Box>
  );
};
