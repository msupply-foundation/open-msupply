import React, { useMemo } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import {
  AppBarContentPortal,
  Box,
  ColumnDef,
  FilterMenu,
  MaterialTable,
  NothingHere,
  Typography,
  usePaginatedMaterialTable,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useDemographicData } from '@openmsupply-client/system';
import { usePrescriptionList } from '../Prescriptions/api';
import {
  isChild011Bucket,
  isChild1223Bucket,
  isChild25Bucket,
  isWomenNonPregnantBucket,
  isWomenPregnantBucket,
  resolveDemographicBuckets,
} from './demographicBuckets';

const DAILY_TALLY_REFERENCE_PREFIX = 'daily tally-';

type CoverageChildGroup = {
  groupId: string;
  groupName: string;
  male: number;
  female: number;
};

type CoverageWomenGroup = {
  groupId: string;
  groupName: string;
  count: number;
};

type CoveragePayload = {
  version: 'DT_COVERAGE_V1';
  itemId: string;
  itemName: string;
  child: CoverageChildGroup[];
  women: CoverageWomenGroup[];
};

type AggregatedCoverageRow = {
  itemId: string;
  itemName: string;
  childUnderOneMale: number;
  childUnderOneFemale: number;
  childOneToTwoMale: number;
  childOneToTwoFemale: number;
  childTwoToFiveMale: number;
  childTwoToFiveFemale: number;
  womenNonPregnant: number;
  womenPregnant: number;
};

type ChildVaccinationRow = {
  itemId: string;
  itemName: string;
  childUnderOneMale: number;
  childUnderOneFemale: number;
  childOneToTwoMale: number;
  childOneToTwoFemale: number;
  childTwoToFiveMale: number;
  childTwoToFiveFemale: number;
  total: number;
};

type WomenVaccinationRow = {
  itemId: string;
  itemName: string;
  pregnant: number;
  nonPregnant: number;
  total: number;
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
};

const parseCoveragePayload = (note?: string | null): CoveragePayload | null => {
  if (!note) return null;

  try {
    const parsed = JSON.parse(note) as Partial<CoveragePayload>;
    if (parsed?.version !== 'DT_COVERAGE_V1') return null;
    if (!parsed.itemId || !parsed.itemName) return null;

    return {
      version: 'DT_COVERAGE_V1',
      itemId: parsed.itemId,
      itemName: parsed.itemName,
      child: (parsed.child ?? []).map(group => ({
        groupId: String(group.groupId ?? ''),
        groupName: String(group.groupName ?? ''),
        male: toNumber(group.male),
        female: toNumber(group.female),
      })),
      women: (parsed.women ?? []).map(group => ({
        groupId: String(group.groupId ?? ''),
        groupName: String(group.groupName ?? ''),
        count: toNumber(group.count),
      })),
    };
  } catch {
    return null;
  }
};

export const DailyTallyReportView = () => {
  const t = useTranslation();
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));
  const { data: demographicData } = useDemographicData.demographics.list();

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

  const {
    query: { data, isError, isFetching },
  } = usePrescriptionList({
    sortBy,
    first,
    offset,
    filterBy,
  });

  const demographicBuckets = useMemo(
    () => resolveDemographicBuckets(demographicData?.nodes),
    [demographicData?.nodes]
  );

  const rows = useMemo((): AggregatedCoverageRow[] => {
    const byItem = new Map<string, AggregatedCoverageRow>();

    for (const prescription of data?.nodes ?? []) {
      const dedupePerInvoice = new Set<string>();

      for (const line of prescription.lines.nodes) {
        const payload = parseCoveragePayload(line.note);
        if (!payload) continue;

        const dedupeKey = `${prescription.id}:${payload.itemId}`;
        if (dedupePerInvoice.has(dedupeKey)) continue;
        dedupePerInvoice.add(dedupeKey);

        const current = byItem.get(payload.itemId) ?? {
          itemId: payload.itemId,
          itemName: payload.itemName,
          childUnderOneMale: 0,
          childUnderOneFemale: 0,
          childOneToTwoMale: 0,
          childOneToTwoFemale: 0,
          childTwoToFiveMale: 0,
          childTwoToFiveFemale: 0,
          womenNonPregnant: 0,
          womenPregnant: 0,
        };

        for (const child of payload.child) {
          if (isChild011Bucket(child.groupId, child.groupName, demographicBuckets)) {
            current.childUnderOneMale += child.male;
            current.childUnderOneFemale += child.female;
            continue;
          }

          if (isChild1223Bucket(child.groupId, child.groupName, demographicBuckets)) {
            current.childOneToTwoMale += child.male;
            current.childOneToTwoFemale += child.female;
            continue;
          }

          if (isChild25Bucket(child.groupId, child.groupName, demographicBuckets)) {
            current.childTwoToFiveMale += child.male;
            current.childTwoToFiveFemale += child.female;
          }
        }

        for (const women of payload.women) {
          if (
            isWomenNonPregnantBucket(
              women.groupId,
              women.groupName,
              demographicBuckets
            )
          ) {
            current.womenNonPregnant += women.count;
            continue;
          }

          if (
            isWomenPregnantBucket(women.groupId, women.groupName, demographicBuckets)
          ) {
            current.womenPregnant += women.count;
          }
        }

        byItem.set(payload.itemId, current);
      }
    }

    return [...byItem.values()].sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [data?.nodes, demographicBuckets]);

  const childRows = useMemo((): ChildVaccinationRow[] => {
    return rows
      .map(row => ({
        itemId: row.itemId,
        itemName: row.itemName,
        childUnderOneMale: row.childUnderOneMale,
        childUnderOneFemale: row.childUnderOneFemale,
        childOneToTwoMale: row.childOneToTwoMale,
        childOneToTwoFemale: row.childOneToTwoFemale,
        childTwoToFiveMale: row.childTwoToFiveMale,
        childTwoToFiveFemale: row.childTwoToFiveFemale,
        total:
          row.childUnderOneMale +
          row.childUnderOneFemale +
          row.childOneToTwoMale +
          row.childOneToTwoFemale +
          row.childTwoToFiveMale +
          row.childTwoToFiveFemale,
      }))
      .filter(row => row.total > 0);
  }, [rows]);

  const womenRows = useMemo((): WomenVaccinationRow[] => {
    return rows
      .map(row => ({
        itemId: row.itemId,
        itemName: row.itemName,
        pregnant: row.womenPregnant,
        nonPregnant: row.womenNonPregnant,
        total: row.womenPregnant + row.womenNonPregnant,
      }))
      .filter(row => row.total > 0);
  }, [rows]);

  const itemColumnSize = isLargeScreen ? 180 : isTablet ? 140 : 120;
  const childNumberColumnSize = isLargeScreen ? 110 : isTablet ? 86 : 74;
  const womenNumberColumnSize = isLargeScreen ? 130 : isTablet ? 100 : 88;
  const totalColumnSize = isLargeScreen ? 90 : 74;
  const cellPaddingX = isLargeScreen ? '10px' : isTablet ? '8px' : '6px';
  const cellPaddingY = isLargeScreen ? '8px' : '4px';

  const childColumns = useMemo(
    (): ColumnDef<ChildVaccinationRow>[] => [
      {
        accessorKey: 'itemName',
        header: 'Vaccine',
        enableSorting: true,
        size: itemColumnSize,
      },
      {
        id: 'childrenUnderOne',
        header: 'Children under 1 years',
        columns: [
          {
            accessorKey: 'childUnderOneMale',
            header: 'Male',
            size: childNumberColumnSize,
          },
          {
            accessorKey: 'childUnderOneFemale',
            header: 'Female',
            size: childNumberColumnSize,
          },
        ],
      },
      {
        id: 'childrenOneToTwo',
        header: 'Children 1 to 2 years',
        columns: [
          {
            accessorKey: 'childOneToTwoMale',
            header: 'Male',
            size: childNumberColumnSize,
          },
          {
            accessorKey: 'childOneToTwoFemale',
            header: 'Female',
            size: childNumberColumnSize,
          },
        ],
      },
      {
        id: 'childrenTwoToFive',
        header: 'Children 2 to 5 years',
        columns: [
          {
            accessorKey: 'childTwoToFiveMale',
            header: 'Male',
            size: childNumberColumnSize,
          },
          {
            accessorKey: 'childTwoToFiveFemale',
            header: 'Female',
            size: childNumberColumnSize,
          },
        ],
      },
      {
        accessorKey: 'total',
        header: 'Total',
        size: totalColumnSize,
      },
    ],
    [t, itemColumnSize, childNumberColumnSize, totalColumnSize]
  );

  const womenColumns = useMemo(
    (): ColumnDef<WomenVaccinationRow>[] => [
      {
        accessorKey: 'itemName',
        header: 'Vaccine',
        enableSorting: true,
        size: itemColumnSize,
      },
      {
        id: 'women1549',
        header: 'Women 15 to 49 years',
        columns: [
          {
            accessorKey: 'pregnant',
            header: 'Pregnant',
            size: womenNumberColumnSize,
          },
          {
            accessorKey: 'nonPregnant',
            header: 'Non pregnant',
            size: womenNumberColumnSize,
          },
        ],
      },
      {
        accessorKey: 'total',
        header: 'Total',
        size: totalColumnSize,
      },
    ],
    [t, itemColumnSize, womenNumberColumnSize, totalColumnSize]
  );

  const { table: childTable } = usePaginatedMaterialTable({
    tableId: 'daily-tally-report-children',
    columns: childColumns,
    data: childRows,
    totalCount: childRows.length,
    isLoading: isFetching,
    isError,
    enablePagination: false,
    enableColumnActions: false,
    enableSorting: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableColumnResizing: false,
    state: { density: 'compact' },
    muiTableHeadCellProps: ({ column }) => ({
      sx: {
        textAlign: column.id === 'itemName' ? 'left' : 'center',
        paddingX: cellPaddingX,
        paddingY: cellPaddingY,
        '& .Mui-TableHeadCell-Content': {
          justifyContent: column.id === 'itemName' ? 'flex-start' : 'center',
        },
        '& .Mui-TableHeadCell-Content-Labels': {
          justifyContent: column.id === 'itemName' ? 'flex-start' : 'center',
        },
      },
    }),
    muiTableBodyCellProps: ({ column }) => ({
      align: column.id === 'itemName' ? 'left' : 'center',
      sx: {
        textAlign: column.id === 'itemName' ? 'left' : 'center',
        paddingX: cellPaddingX,
        paddingY: isLargeScreen ? '6px' : '4px',
      },
    }),
    muiTableContainerProps: { sx: { width: '100%', overflowX: 'auto' } },
    noDataElement: <NothingHere body={'No child vaccination data found for this date range.'} />,
  });

  const { table: womenTable } = usePaginatedMaterialTable({
    tableId: 'daily-tally-report-women',
    columns: womenColumns,
    data: womenRows,
    totalCount: womenRows.length,
    isLoading: isFetching,
    isError,
    enablePagination: false,
    enableColumnActions: false,
    enableSorting: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableColumnResizing: false,
    state: { density: 'compact' },
    muiTableHeadCellProps: ({ column }) => ({
      sx: {
        textAlign: column.id === 'itemName' ? 'left' : 'center',
        paddingX: cellPaddingX,
        paddingY: cellPaddingY,
        '& .Mui-TableHeadCell-Content': {
          justifyContent: column.id === 'itemName' ? 'flex-start' : 'center',
        },
        '& .Mui-TableHeadCell-Content-Labels': {
          justifyContent: column.id === 'itemName' ? 'flex-start' : 'center',
        },
      },
    }),
    muiTableBodyCellProps: ({ column }) => ({
      align: column.id === 'itemName' ? 'left' : 'center',
      sx: {
        textAlign: column.id === 'itemName' ? 'left' : 'center',
        paddingX: cellPaddingX,
        paddingY: isLargeScreen ? '6px' : '4px',
      },
    }),
    muiTableContainerProps: { sx: { width: '100%', overflowX: 'auto' } },
    noDataElement: <NothingHere body={'No women vaccination data found for this date range.'} />,
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

      {!isFetching && !isError && childRows.length === 0 && womenRows.length === 0 ? (
        <NothingHere body={'No Daily Tally coverage data found for this date range.'} />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, marginBottom: 1.5, textAlign: 'center' }}
            >
              Child Vaccination
            </Typography>
            <MaterialTable table={childTable} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, marginBottom: 1.5, textAlign: 'center' }}
            >
              Women Vaccination
            </Typography>
            <MaterialTable table={womenTable} />
          </Box>
        </Box>
      )}
    </>
  );
};
