import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Box, Typography } from '@mui/material';
import { useSession } from '@/app/session';
import { DataTable } from '@/components/DataTable';
import { stocktakesQueryOptions } from './queries';
import type { StocktakeRowFragment } from './stocktake.generated';

const route = getRouteApi('/_authenticated/stocktake/');
const helper = createColumnHelper<StocktakeRowFragment>();

const columns = [
  helper.accessor('stocktakeNumber', { id: 'number', header: 'Number' }),
  helper.accessor('status', { id: 'status', header: 'Status' }),
  helper.accessor('description', {
    id: 'description',
    header: 'Description',
    cell: c => c.getValue() ?? '',
  }),
];

export function StocktakeListPage() {
  const navigate = route.useNavigate();
  const storeId = useSession(s => s.store?.id) ?? '';
  const { data } = useQuery({
    ...stocktakesQueryOptions(storeId),
    enabled: Boolean(storeId),
  });

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
      <Typography variant="h5">Stocktakes</Typography>
      <DataTable
        table={table}
        onRowClick={row =>
          navigate({
            to: '/stocktake/$stocktakeId',
            params: { stocktakeId: row.id },
          })
        }
      />
    </Box>
  );
}
