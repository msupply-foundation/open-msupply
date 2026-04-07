import React, { useMemo } from 'react';
import {
  AppBarButtonsPortal,
  AppBarContentPortal,
  Box,
  ButtonWithIcon,
  ColumnDef,
  ColumnType,
  FilterMenu,
  Grid,
  MaterialTable,
  NothingHere,
  PlusCircleIcon,
  RouteBuilder,
  Typography,
  useNavigate,
  usePaginatedMaterialTable,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { usePrescriptionList } from '../Prescriptions/api';
import { PrescriptionRowFragment } from '../Prescriptions/api/operations.generated';
import { useStocktakeList } from '@openmsupply-client/inventory/src/Stocktake/api/hooks/useStocktakeList';

const DAILY_TALLY_REFERENCE_PREFIX = 'daily tally-';

const dailyTallyNewPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart('daily-tally')
  .addPart('new')
  .build();

const prescriptionPath = (id: string) =>
  RouteBuilder.create(AppRoute.Dispensary)
    .addPart(AppRoute.Prescription)
    .addPart(id)
    .build();

const stocktakePath = (id: string) =>
  RouteBuilder.create(AppRoute.Inventory)
    .addPart(AppRoute.Stocktakes)
    .addPart(id)
    .build();

type DailyTallyListRow = PrescriptionRowFragment & {
  stocktakeId?: string;
  stocktakeNumber?: number;
};

const PRESCRIPTION_LINK_TOKEN = /\bprescription:([0-9a-fA-F-]{36})\b/;
const STOCKTAKE_MATCH_WINDOW_MS = 10 * 60 * 1000;

export const DailyTallyListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();

  const {
    queryParams: { first, offset, sortBy, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'prescriptionDatetime', dir: 'desc' },
    initialFilter: [
      {
        id: 'theirReference',
        value: DAILY_TALLY_REFERENCE_PREFIX,
      },
    ],
    filters: [
      { key: 'theirReference' },
      {
        key: 'createdOrBackdatedDatetime',
        condition: 'between',
      },
    ],
  });

  const listParams = {
    sortBy,
    first,
    offset,
    filterBy,
  };

  const {
    query: { data, isError, isFetching },
  } = usePrescriptionList(listParams);

  const {
    query: { data: stocktakeData, isFetching: isStocktakeFetching },
  } = useStocktakeList({
    first: 5000,
    offset: 0,
    filterBy: {
      comment: { like: DAILY_TALLY_REFERENCE_PREFIX },
      description: { like: 'Daily tally wastage' },
    },
  });

  const rows = useMemo((): DailyTallyListRow[] => {
    const stocktakes = stocktakeData?.nodes ?? [];
    const usedStocktakeIds = new Set<string>();

    const stocktakeByPrescriptionId = new Map<
      string,
      { id: string; number: number; createdDatetime: string }
    >();
    const stocktakesByReference = new Map<
      string,
      Array<{ id: string; number: number; createdDatetime: string }>
    >();

    for (const stocktake of stocktakes) {
      const comment = stocktake.comment?.trim() ?? '';
      const linkedPrescriptionId = comment.match(PRESCRIPTION_LINK_TOKEN)?.[1];
      if (linkedPrescriptionId && !stocktakeByPrescriptionId.has(linkedPrescriptionId)) {
        stocktakeByPrescriptionId.set(linkedPrescriptionId, {
          id: stocktake.id,
          number: stocktake.stocktakeNumber,
          createdDatetime: stocktake.createdDatetime,
        });
      }

      const reference = comment.split('|')[0]?.trim();
      if (!reference) continue;
      const group = stocktakesByReference.get(reference) ?? [];
      group.push({
        id: stocktake.id,
        number: stocktake.stocktakeNumber,
        createdDatetime: stocktake.createdDatetime,
      });
      stocktakesByReference.set(reference, group);
    }

    for (const group of stocktakesByReference.values()) {
      group.sort(
        (a, b) =>
          new Date(a.createdDatetime).getTime() -
          new Date(b.createdDatetime).getTime()
      );
    }

    return (data?.nodes ?? []).map(prescription => {
      const reference = prescription.theirReference?.trim() ?? '';
      const directMatch = stocktakeByPrescriptionId.get(prescription.id);
      if (directMatch && !usedStocktakeIds.has(directMatch.id)) {
        usedStocktakeIds.add(directMatch.id);
        return {
          ...prescription,
          stocktakeId: directMatch.id,
          stocktakeNumber: directMatch.number,
        };
      }

      const candidates = stocktakesByReference.get(reference) ?? [];
      const prescriptionTime = new Date(
        prescription.prescriptionDate || prescription.createdDatetime
      ).getTime();

      let nearestCandidate:
        | { id: string; number: number; createdDatetime: string }
        | undefined;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const candidate of candidates) {
        if (usedStocktakeIds.has(candidate.id)) continue;
        const candidateTime = new Date(candidate.createdDatetime).getTime();
        const distance = Math.abs(candidateTime - prescriptionTime);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestCandidate = candidate;
        }
      }

      if (nearestCandidate && nearestDistance <= STOCKTAKE_MATCH_WINDOW_MS) {
        usedStocktakeIds.add(nearestCandidate.id);
        return {
          ...prescription,
          stocktakeId: nearestCandidate.id,
          stocktakeNumber: nearestCandidate.number,
        };
      }

      return {
        ...prescription,
        stocktakeId: undefined,
        stocktakeNumber: undefined,
      };
    });
  }, [data?.nodes, stocktakeData?.nodes]);

  const columns = useMemo(
    (): ColumnDef<DailyTallyListRow>[] => [
      {
        accessorKey: 'theirReference',
        header: t('label.reference'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'otherPartyName',
        header: t('label.name'),
        enableSorting: true,
        size: 180,
      },
      {
        id: 'prescriptionNumber',
        header: 'Prescription',
        accessorFn: row => row.invoiceNumber,
        enableSorting: true,
        size: 120,
        Cell: ({ row }) => (
          <Typography
            color="primary"
            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={event => {
              event.stopPropagation();
              navigate(prescriptionPath(row.original.id));
            }}
          >
            {row.original.invoiceNumber}
          </Typography>
        ),
      },
      {
        id: 'stocktakeNumber',
        header: 'Wastage Adjustment',
        accessorFn: row => row.stocktakeNumber ?? '',
        enableSorting: false,
        size: 120,
        Cell: ({ row }) => {
          const stocktakeId = row.original.stocktakeId;
          const stocktakeNumber = row.original.stocktakeNumber;
          if (!stocktakeId || !stocktakeNumber) return <Typography>-</Typography>;

          return (
            <Typography
              color="primary"
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={event => {
                event.stopPropagation();
                navigate(stocktakePath(stocktakeId));
              }}
            >
              {stocktakeNumber}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'prescriptionDatetime',
        header: t('label.prescription-date'),
        columnType: ColumnType.Date,
        enableSorting: true,
        accessorFn: (row: DailyTallyListRow) =>
          row.prescriptionDate || row.createdDatetime,
        size: 150,
      },
    ],
    [navigate, t]
  );

  const { table } = usePaginatedMaterialTable({
    tableId: 'daily-tally-list',
    columns,
    data: rows,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching || isStocktakeFetching,
    isError,
    onRowClick: row => {
      navigate(prescriptionPath(row.id));
    },
    noDataElement: (
      <NothingHere
        body={'No daily tally sheets yet'}
        onCreate={() => navigate(dailyTallyNewPath)}
        buttonText={'Add new tally sheet'}
      />
    ),
  });

  return (
    <>
      <AppBarContentPortal
        sx={{
          paddingBottom: '16px',
          flex: 1,
          justifyContent: 'space-between',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box display="flex" gap={1} alignItems="center">
          <FilterMenu
            filters={[
              {
                type: 'text',
                name: t('label.reference'),
                urlParameter: 'theirReference',
                isDefault: true,
              },
              {
                type: 'group',
                name: t('label.date'),
                elements: [
                  {
                    type: 'dateTime',
                    name: t('label.from-date'),
                    urlParameter: 'createdOrBackdatedDatetime',
                    range: 'from',
                    isDefault: true,
                  },
                  {
                    type: 'dateTime',
                    name: t('label.to-date'),
                    urlParameter: 'createdOrBackdatedDatetime',
                    range: 'to',
                    isDefault: true,
                  },
                ],
              },
            ]}
          />
        </Box>
      </AppBarContentPortal>

      <AppBarButtonsPortal>
        <Grid container gap={1}>
          <ButtonWithIcon
            Icon={<PlusCircleIcon />}
            label={'Add new tally sheet'}
            onClick={() => navigate(dailyTallyNewPath)}
          />
        </Grid>
      </AppBarButtonsPortal>

      <MaterialTable table={table} />
    </>
  );
};
