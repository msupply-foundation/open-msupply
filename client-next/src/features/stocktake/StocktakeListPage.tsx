import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
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
    <div className="flex h-full flex-col gap-2">
      <h1 className="text-xl font-semibold">{t('app.stocktakes')}</h1>
      <DataTable
        table={table}
        onRowClick={row =>
          navigate({
            to: '/$storeId/stocktake/$stocktakeId',
            params: { storeId, stocktakeId: row.id },
          })
        }
      />
    </div>
  );
}
