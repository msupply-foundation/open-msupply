import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useSession } from '@/app/session';
import { stockLineQueryOptions } from './queries';

const route = getRouteApi('/_authenticated/stock/$stockLineId');

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={500}>{value}</Typography>
    </Stack>
  );
}

export function StockDetailPage() {
  const { stockLineId } = route.useParams();
  const storeId = useSession(s => s.store?.id) ?? '';

  const { data, isLoading } = useQuery({
    ...stockLineQueryOptions(storeId, stockLineId),
    enabled: Boolean(storeId),
  });

  if (isLoading) return <Typography>Loading…</Typography>;
  if (!data) return <Typography>Stock line not found.</Typography>;

  return (
    <Stack spacing={2} sx={{ maxWidth: 560 }}>
      <Typography variant="h5">{data.item.name}</Typography>
      <Card>
        <CardContent>
          <Stack spacing={1} divider={<Divider flexItem />}>
            <Field label="Item code" value={data.item.code} />
            <Field label="Batch" value={data.batch ?? '—'} />
            <Field label="Pack size" value={data.packSize} />
            <Field label="Packs in stock" value={data.totalNumberOfPacks} />
            <Field label="Available packs" value={data.availableNumberOfPacks} />
            <Field label="Location" value={data.locationName ?? '—'} />
            <Field label="Supplier" value={data.supplierName ?? '—'} />
            <Field label="On hold" value={data.onHold ? 'Yes' : 'No'} />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
