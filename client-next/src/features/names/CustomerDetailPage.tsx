import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  Card,
  CardContent,
  Divider,
  Link as MuiLink,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from '@/intl';
import { formatDate } from '@/lib/format';
import { customerByIdQueryOptions } from './customerDetail.queries';
import type { CustomerDetailFragment } from './customerDetail.generated';

const route = getRouteApi(
  '/_authenticated/$storeId/distribution/customers/$nameId',
);

function Field({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography component="div" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Stack>
  );
}

export function CustomerDetailPage() {
  const { storeId, nameId } = route.useParams();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    ...customerByIdQueryOptions(storeId, nameId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <Typography>{t('messages.loading')}</Typography>;
  if (!data) return <Typography>{t('messages.name-not-found')}</Typography>;

  return <CustomerDetail customer={data} />;
}

function CustomerDetail({ customer }: { customer: CustomerDetailFragment }) {
  const { t } = useTranslation();
  const yesNo = (value: boolean) => (value ? t('messages.yes') : t('messages.no'));

  return (
    <Stack spacing={2} sx={{ maxWidth: 560 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {customer.name}
      </Typography>
      <Card>
        <CardContent>
          <Stack spacing={1} divider={<Divider flexItem />}>
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
            <Field label={t('label.on-hold')} value={yesNo(customer.isOnHold)} />
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
                  <MuiLink
                    href={customer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {customer.website}
                  </MuiLink>
                ) : (
                  '—'
                )
              }
            />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
