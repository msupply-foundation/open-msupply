import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from '@/intl';
import { stockLineQueryOptions } from './queries';

const route = getRouteApi('/_authenticated/$storeId/stock/$stockLineId');

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 500 }}>{value}</Typography>
    </Stack>
  );
}

export function StockDetailPage() {
  const { storeId, stockLineId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...stockLineQueryOptions(storeId, stockLineId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <Typography>{t('messages.loading')}</Typography>;
  if (!data) return <Typography>{t('messages.stock-not-found')}</Typography>;

  return (
    <Stack spacing={2} sx={{ maxWidth: 560 }}>
      <Typography variant="h5">{data.item.name}</Typography>
      <Card>
        <CardContent>
          <Stack spacing={1} divider={<Divider flexItem />}>
            <Field label={t('label.item-code')} value={data.item.code} />
            <Field label={t('label.batch')} value={data.batch ?? '—'} />
            <Field label={t('label.pack-size')} value={data.packSize} />
            <Field label={t('label.packs-in-stock')} value={data.totalNumberOfPacks} />
            <Field
              label={t('label.available-packs')}
              value={data.availableNumberOfPacks}
            />
            <Field label={t('label.location')} value={data.locationName ?? '—'} />
            <Field label={t('label.supplier')} value={data.supplierName ?? '—'} />
            <Field
              label={t('label.on-hold')}
              value={data.onHold ? t('messages.yes') : t('messages.no')}
            />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
