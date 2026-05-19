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

export const StocktakeLineEditErrorBanner: React.FC<StocktakeLineErrorBannerProps> = ({
  draftLines,
}) => {
  const t = useTranslation();
  const { errors } = useStocktakeLineErrorContext();

  const visibleErrors = draftLines
    .map(line => {
      const error = errors[line.id];
      if (!error) return null;
      return { line, error };
    })
    .filter(<T,>(x: T | null): x is T => x !== null);

  if (visibleErrors.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 1 }}>
      {visibleErrors.map(({ line, error }) => (
        <Alert key={line.id} severity="error">
          {line.batch ? `${line.batch}: ` : ''}
          {t(stocktakeLineErrorMessageKey(error.__typename))}
        </Alert>
      ))}
    </Box>
  );
};
