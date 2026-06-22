import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from '@/intl';
import { formatDate } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { customerByIdQueryOptions } from './customerDetail.queries';
import type { CustomerDetailFragment } from './customerDetail.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/distribution/customers/$nameId',
);

function Field({ label, value }: { label: string; value: ReactNode }) {
  // Stack the label above the value on phones (xs) and place them side by side
  // from sm up. min-w-0 + overflow-wrap let long values (URLs, addresses) wrap
  // instead of forcing horizontal overflow on a narrow viewport.
  return (
    <div className="flex flex-col justify-between gap-0.5 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="min-w-0 font-medium [overflow-wrap:anywhere] sm:text-right">
        {value}
      </div>
    </div>
  );
}

export function CustomerDetailPage() {
  const { storeId, nameId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...customerByIdQueryOptions(storeId, nameId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <p>{t('messages.loading')}</p>;
  if (!data) return <p>{t('messages.name-not-found')}</p>;

  return <CustomerDetail customer={data} />;
}

function CustomerDetail({ customer }: { customer: CustomerDetailFragment }) {
  const { t } = useTranslation();
  const yesNo = (value: boolean) =>
    value ? t('messages.yes') : t('messages.no');

  return (
    <div className="flex w-full max-w-[560px] flex-col gap-4">
      <h1 className="text-xl font-bold [overflow-wrap:anywhere]">
        {customer.name}
      </h1>
      <Card>
        <CardContent>
          <div className="flex flex-col divide-y">
            <Field label={t('label.code')} value={customer.code} />
            <Field
              label={t('label.charge-code')}
              value={customer.chargeCode ?? '—'}
            />
            <Field label={t('label.comment')} value={customer.comment ?? '—'} />
            <Field label={t('label.phone')} value={customer.phone ?? '—'} />
            <Field
              label={t('label.date-created')}
              value={formatDate(customer.createdDatetime) || '—'}
            />
            <Field
              label={t('label.manufacturer')}
              value={yesNo(customer.isManufacturer)}
            />
            <Field label={t('label.donor')} value={yesNo(customer.isDonor)} />
            <Field
              label={t('label.on-hold')}
              value={yesNo(customer.isOnHold)}
            />
            <Field
              label={t('label.address')}
              value={
                [customer.address1, customer.address2]
                  .filter(Boolean)
                  .join(', ') || '—'
              }
            />
            <Field label={t('label.country')} value={customer.country ?? '—'} />
            <Field
              label={t('label.website')}
              value={
                customer.website ? (
                  <a
                    className="text-primary underline-offset-4 hover:underline"
                    href={customer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {customer.website}
                  </a>
                ) : (
                  '—'
                )
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
