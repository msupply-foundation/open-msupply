import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Box, Typography } from '@mui/material';
import { useTranslation } from '@/intl';
import { DataTable } from '@/components/DataTable';
import { stocktakesQueryOptions } from './queries';
import type { StocktakeRowFragment } from './stocktake.generated';

const route = getRouteApi('/_authenticated/$storeId/stocktake/');
const helper = createColumnHelper<StocktakeRowFragment>();

export function StocktakeListPage() {
  const navigate = route.useNavigate();
  const { t } = useTranslation();
  const { storeId } = route.useParams();
  const { data } = useQuery({
    ...stocktakesQueryOptions(storeId),
    enabled: Boolean(storeId),
  });

  const columns = useMemo(
    () => [
      helper.accessor('stocktakeNumber', {
        id: 'number',
        header: t('label.number'),
      }),
      helper.accessor('status', { id: 'status', header: t('label.status') }),
      helper.accessor('description', {
        id: 'description',
        header: t('label.description'),
        cell: c => c.getValue() ?? '',
      }),
    ],
    [t],
  );

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
      <Typography variant="h5">{t('app.stocktakes')}</Typography>
      <DataTable
        table={table}
        onRowClick={row =>
          navigate({
            to: '/$storeId/stocktake/$stocktakeId',
            params: { storeId, stocktakeId: row.id },
          })
        }
      />
    </Box>
  );
}
