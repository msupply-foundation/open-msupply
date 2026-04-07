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
  useNavigate,
  usePaginatedMaterialTable,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { usePrescriptionList } from '../Prescriptions/api';
import { PrescriptionRowFragment } from '../Prescriptions/api/operations.generated';

const DAILY_TALLY_REFERENCE_PREFIX = 'daily tally-';

const dailyTallyNewPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart('daily-tally')
  .addPart('new')
  .build();

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

  const columns = useMemo(
    (): ColumnDef<PrescriptionRowFragment>[] => [
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
        accessorKey: 'invoiceNumber',
        header: t('label.invoice-number'),
        enableSorting: true,
        size: 120,
      },
      {
        accessorKey: 'prescriptionDatetime',
        header: t('label.prescription-date'),
        columnType: ColumnType.Date,
        enableSorting: true,
        accessorFn: (row: PrescriptionRowFragment) =>
          row.prescriptionDate || row.createdDatetime,
        size: 150,
      },
    ],
    [t]
  );

  const { table } = usePaginatedMaterialTable({
    tableId: 'daily-tally-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching,
    isError,
    onRowClick: row => {
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.Prescription)
          .addPart(row.id)
          .build()
      );
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
