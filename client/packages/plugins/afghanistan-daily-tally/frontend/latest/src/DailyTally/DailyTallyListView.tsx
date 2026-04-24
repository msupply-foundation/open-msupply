import React, { useEffect, useMemo } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
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
  useBreadcrumbs,
  usePaginatedMaterialTable,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { usePrescriptionList } from '@openmsupply-client/invoices/src/Prescriptions/api';
import { PrescriptionRowFragment } from '@openmsupply-client/invoices/src/Prescriptions/api/operations.generated';
import { usePrescriptionGraphQL } from '@openmsupply-client/invoices/src/Prescriptions/api/usePrescriptionGraphQL';
import { useStocktakeList } from '@openmsupply-client/inventory/src/Stocktake/api/hooks/useStocktakeList';

const DAILY_TALLY_REFERENCE_PREFIX = 'Daily tally -';

const dailyTallyNewPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart('daily-tally')
  .addPart('new')
  .build();
const dailyTallyResumeDraftPath = `${dailyTallyNewPath}?resumeDraft=1`;

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
  isDraftRow?: boolean;
};

const PRESCRIPTION_LINK_TOKEN = /\bprescription:([0-9a-fA-F-]{36})\b/;
const STOCKTAKE_MATCH_WINDOW_MS = 10 * 60 * 1000;
const DAILY_TALLY_DRAFT_VERSION = 1;
const DAILY_TALLY_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const getDailyTallyDraftStorageKey = (storeId: string) =>
  `@openmsupply-client/daily-tally/draft/${storeId}`;

type DailyTallyPersistedDraft = {
  version: number;
  savedAt: string;
  payload: unknown;
};

const formatPatientName = (value?: string | null) => {
  const normalized = (value ?? '').trim().replace(/\s+/g, ' ');
  if (!normalized) return '';

  if (normalized.includes(',')) {
    const [lastName, ...firstParts] = normalized
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);
    const firstName = firstParts.join(' ');
    if (firstName && lastName) return `${firstName}, ${lastName}`;
  }

  return normalized;
};

export const DailyTallyListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { storeId } = usePrescriptionGraphQL();
  const theme = useTheme();
  const isPortraitOrientation = useMediaQuery('(orientation: portrait)');
  const isTabletOrSmaller = useMediaQuery(theme.breakpoints.down('md'));
  const useCompactAddButtonLabel = isTabletOrSmaller && isPortraitOrientation;
  const [hasSavedDraft, setHasSavedDraft] = React.useState(false);
  const [savedDraftAt, setSavedDraftAt] = React.useState<string | null>(null);

  useEffect(() => {
    if (!storeId) {
      setHasSavedDraft(false);
      setSavedDraftAt(null);
      return;
    }

    const draftStorageKey = getDailyTallyDraftStorageKey(storeId);
    const rawDraft = localStorage.getItem(draftStorageKey);
    if (!rawDraft) {
      setHasSavedDraft(false);
      setSavedDraftAt(null);
      return;
    }

    try {
      const parsed = JSON.parse(rawDraft) as DailyTallyPersistedDraft;
      if (
        parsed.version !== DAILY_TALLY_DRAFT_VERSION ||
        !parsed.savedAt ||
        parsed.payload === undefined
      ) {
        localStorage.removeItem(draftStorageKey);
        setHasSavedDraft(false);
        setSavedDraftAt(null);
        return;
      }

      const savedAt = new Date(parsed.savedAt).getTime();
      if (!Number.isFinite(savedAt) || Date.now() - savedAt > DAILY_TALLY_DRAFT_TTL_MS) {
        localStorage.removeItem(draftStorageKey);
        setHasSavedDraft(false);
        setSavedDraftAt(null);
        return;
      }

      setHasSavedDraft(true);
      setSavedDraftAt(parsed.savedAt);
    } catch {
      localStorage.removeItem(draftStorageKey);
      setHasSavedDraft(false);
      setSavedDraftAt(null);
    }
  }, [storeId]);

  useEffect(() => {
    setCustomBreadcrumbs({
      0: 'Daily tally',
    });
  }, [setCustomBreadcrumbs]);

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

    const mappedRows = (data?.nodes ?? []).map(prescription => {
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

    if (!hasSavedDraft) return mappedRows;

    const draftRow: DailyTallyListRow = {
      ...(mappedRows[0] ?? {
        id: 'draft-row-fallback',
        invoiceNumber: 0,
        theirReference: null,
        otherPartyName: null,
        createdDatetime: new Date().toISOString(),
        prescriptionDate: null,
      }),
      id: '__daily_tally_saved_draft__',
      isDraftRow: true,
      theirReference: 'Resume draft tally sheet',
      otherPartyName: 'Unsaved counter draft',
      invoiceNumber: null,
      stocktakeId: undefined,
      stocktakeNumber: undefined,
      prescriptionDate: savedDraftAt ?? new Date().toISOString(),
      createdDatetime: savedDraftAt ?? new Date().toISOString(),
    } as DailyTallyListRow;

    return [draftRow, ...mappedRows];
  }, [data?.nodes, hasSavedDraft, savedDraftAt, stocktakeData?.nodes]);

  const columns = useMemo(
    (): ColumnDef<DailyTallyListRow>[] => [
      {
        accessorKey: 'theirReference',
        header: t('label.reference'),
        enableSorting: true,
        enableColumnFilter: true,
        size: 130,
        Cell: ({ row }) => (
          <Typography
            sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: row.original.isDraftRow ? 700 : undefined,
              color: row.original.isDraftRow ? 'secondary.main' : undefined,
            }}
            title={row.original.theirReference ?? ''}
          >
            {row.original.theirReference}
          </Typography>
        ),
      },
      {
        accessorKey: 'otherPartyName',
        header: t('label.name'),
        enableSorting: true,
        size: 130,
        accessorFn: row => formatPatientName(row.otherPartyName),
        Cell: ({ row }) => (
          <Typography
            sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={formatPatientName(row.original.otherPartyName)}
          >
            {row.original.isDraftRow
              ? 'Tap row to continue'
              : formatPatientName(row.original.otherPartyName)}
          </Typography>
        ),
      },
      {
        id: 'prescriptionNumber',
        header: 'Prescription',
        accessorFn: row => row.invoiceNumber,
        enableSorting: true,
        size: 90,
        Cell: ({ row }) => (
          row.original.isDraftRow ? (
            <Typography color="secondary" sx={{ fontWeight: 700 }}>
              Resume
            </Typography>
          ) : (
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
          )
        ),
      },
      {
        id: 'stocktakeNumber',
        header: 'Wastage Adjustment',
        accessorFn: row => row.stocktakeNumber ?? '',
        enableSorting: false,
        size: 90,
        Cell: ({ row }) => {
          if (row.original.isDraftRow) return <Typography color="text.secondary">-</Typography>;
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
        size: 120,
      },
    ],
    [navigate, t]
  );

  const { table } = usePaginatedMaterialTable({
    tableId: 'daily-tally-list',
    columns,
    data: rows,
    totalCount: (data?.totalCount ?? 0) + (hasSavedDraft ? 1 : 0),
    isLoading: isFetching || isStocktakeFetching,
    isError,
    onRowClick: row => {
      if ((row as DailyTallyListRow).isDraftRow) {
        navigate(dailyTallyResumeDraftPath);
        return;
      }
      navigate(prescriptionPath(row.id));
    },
    muiTableBodyRowProps: ({ row }) =>
      (row.original as DailyTallyListRow).isDraftRow
        ? {
            sx: {
              backgroundColor: 'rgba(237,108,2,0.10)',
              '& td': {
                borderBottom: '1px solid rgba(237,108,2,0.30)',
              },
            },
          }
        : undefined,
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
          {hasSavedDraft ? (
            <ButtonWithIcon
              Icon={<PlusCircleIcon />}
              label={'Resume draft tally sheet'}
              variant="contained"
              color="secondary"
              shouldShrink={!useCompactAddButtonLabel}
              sx={{
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(237,108,2,0.28)',
              }}
              onClick={() => navigate(dailyTallyResumeDraftPath)}
            />
          ) : null}
          <ButtonWithIcon
            Icon={<PlusCircleIcon />}
            label={useCompactAddButtonLabel ? 'Add tally' : 'Add new tally sheet'}
            shouldShrink={!useCompactAddButtonLabel}
            onClick={() => navigate(dailyTallyNewPath)}
          />
        </Grid>
      </AppBarButtonsPortal>

      <MaterialTable table={table} />
    </>
  );
};
