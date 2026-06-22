import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from '@/intl';
import { Card, CardContent } from '@/components/ui/card';
import { stockLineQueryOptions } from './queries';

const route = getRouteApi('/_authenticated/$storeId/stock/$stockLineId');

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function StockDetailPage() {
  const { storeId, stockLineId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...stockLineQueryOptions(storeId, stockLineId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <p>{t('messages.loading')}</p>;
  if (!data) return <p>{t('messages.stock-not-found')}</p>;

  return (
    <div className="flex max-w-[560px] flex-col gap-4">
      <h1 className="text-xl font-semibold">{data.item.name}</h1>
      <Card>
        <CardContent>
          <div className="divide-y">
            <Field label={t('label.item-code')} value={data.item.code} />
            <Field label={t('label.batch')} value={data.batch ?? '—'} />
            <Field label={t('label.pack-size')} value={data.packSize} />
            <Field
              label={t('label.packs-in-stock')}
              value={data.totalNumberOfPacks}
            />
            <Field
              label={t('label.available-packs')}
              value={data.availableNumberOfPacks}
            />
            <Field
              label={t('label.location')}
              value={data.locationName ?? '—'}
            />
            <Field
              label={t('label.supplier')}
              value={data.supplierName ?? '—'}
            />
            <Field
              label={t('label.on-hold')}
              value={data.onHold ? t('messages.yes') : t('messages.no')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
