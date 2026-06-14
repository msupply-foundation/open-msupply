import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { Typography } from '@mui/material';
import { useTranslation } from '@/intl';
import { stocktakeLinesQueryOptions, stocktakeQueryOptions } from './queries';
import { StocktakeGrid } from './StocktakeGrid';

const route = getRouteApi('/_authenticated/$storeId/stocktake/$stocktakeId');

export function StocktakeDetailPage() {
  const { storeId, stocktakeId } = route.useParams();
  const { t } = useTranslation();

  const { data: header } = useQuery({
    ...stocktakeQueryOptions(storeId, stocktakeId),
    enabled: Boolean(storeId),
  });
  const { data: lines, isLoading } = useQuery({
    ...stocktakeLinesQueryOptions(storeId, stocktakeId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <Typography>{t('messages.loading')}</Typography>;

  return (
    <StocktakeGrid
      storeId={storeId}
      stocktakeId={stocktakeId}
      header={header}
      lines={lines ?? []}
    />
  );
}
