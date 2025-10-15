import React, { FC, useEffect, useMemo } from 'react';
import {
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  InlineSpinner,
  useTranslation,
  DataTable,
  useColumns,
  NothingHere,
  useFormatDateTime,
  useRowStyle,
  useTheme,
  StatusCell as StatusCellOld,
  VaccinationCardItemNodeStatus,
  useNonPaginatedMaterialTable,
  MaterialTable,
  ColumnDef,
  ColumnType,
} from '@openmsupply-client/common';
import { StatusCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components';
import {
  VaccinationCardFragment,
  VaccinationCardItemFragment,
} from '../api/operations.generated';
import { isPreviousDoseGiven } from '../utils';

interface VaccinationCardProps {
  programEnrolmentId: string;
  openModal: (row: VaccinationCardItemFragment) => void;
  encounterId?: string;
  data?: VaccinationCardFragment;
  isLoading: boolean;
}

const canClickRow = (
  isEncounter: boolean,
  row: VaccinationCardItemFragment,
  items: VaccinationCardItemFragment[] | undefined,
  canSkipDose: boolean
) => {
  if (!isEncounter) return false;
  if (canSkipDose) return true;
  return isPreviousDoseGiven(row, items);
};

const useStyleRowsByStatus = (
  rows: VaccinationCardItemFragment[] | undefined,
  isEncounter: boolean,
  canSkipDose: boolean
) => {
  const { updateRowStyles } = useRowStyle();
  const theme = useTheme();

  // This replaces the default "box-shadow", and is not an exact replacement,
  // but pretty close. Can be refined in future.
  const BORDER_STYLE = '0.75px solid rgba(143, 144, 166, 0.3)';

  useEffect(() => {
    if (!rows) return;

    const allRows = rows.map(({ id }) => id);
    const givenRows = rows
      .filter(row => row.status === VaccinationCardItemNodeStatus.Given)
      .map(row => row.id);
    const nonClickableRows = rows
      .filter(row => !canClickRow(isEncounter, row, rows, canSkipDose))
      .map(row => row.id);
    const lastOfEachAgeRange = rows
      .filter(
        (row, index) => row.minAgeMonths !== rows[index + 1]?.minAgeMonths
      )
      .map(row => row.id);

    updateRowStyles(nonClickableRows, {
      '& td': {
        cursor: 'default',
      },
    });
    updateRowStyles(allRows, {
      backgroundColor: 'white !important',
      boxShadow: 'none',
      '& td': {
        borderBottom: `${BORDER_STYLE} !important`,
      },
      // Reset all rows to white, then apply green to given rows below
      '& td:not(:first-of-type)': {
        backgroundColor: `white !important`,
      },
      '& td:nth-of-type(2)': {
        borderLeft: BORDER_STYLE,
      },
      '& td:first-of-type': {
        borderBottom: 'none !important',
        fontWeight: 'bold',
      },
    });
    updateRowStyles(givenRows, {
      '& td:not(:first-of-type)': {
        backgroundColor: `${theme.palette.background.success} !important`,
      },
    });
    updateRowStyles(lastOfEachAgeRange, {
      '& td:first-of-type': {
        borderBottom: BORDER_STYLE,
        fontWeight: 'bold',
      },
    });
  }, [rows]);
};

const VaccinationCardComponent = ({
  data,
  encounterId,
  openModal,
}: VaccinationCardProps & {
  data?: VaccinationCardFragment;
}) => {
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();
  const theme = useTheme();

  const isEncounter = !!encounterId;

  const canSkipDose = data?.items.some(item => item.canSkipDose) ?? false;

  useStyleRowsByStatus(data?.items, isEncounter, canSkipDose);

  const getAgeLabel = (row: VaccinationCardItemFragment) => {
    if (row.customAgeLabel) return row.customAgeLabel;

    const years = Math.floor(row.minAgeMonths / 12);
    const months = row.minAgeMonths % 12;

    const monthsLabel = t('label.age-months-count', { count: months });

    if (years > 0) {
      const yearsLabel = t('label.age-years', { count: years });

      return months > 0 ? `${yearsLabel} ${monthsLabel}` : yearsLabel;
    }

    return monthsLabel;
  };

  const isAgeSameAsPreviousRow = (row: VaccinationCardItemFragment) => {
    const index = data?.items.findIndex(item => item.id === row.id) ?? 0;
    return row.minAgeMonths === data?.items?.[index - 1]?.minAgeMonths;
  };

  const columns = useMemo(
    (): ColumnDef<VaccinationCardItemFragment>[] => [
      {
        id: 'age',
        header: t('label.age'),
        size: 160,
        pin: 'left',
        accessorFn: row =>
          isAgeSameAsPreviousRow(row) ? null : getAgeLabel(row),
        muiTableBodyCellProps: ({ row }) => ({
          sx: {
            fontWeight: 'bold',
            paddingLeft: 2,
            ...(isAgeSameAsPreviousRow(row.original)
              ? { borderBottom: 'none' }
              : {}),
          },
        }),
        enableHiding: false,
        enableColumnOrdering: false,
      },
      {
        accessorKey: 'label',
        header: t('label.dose'),
        size: 100,
        enableHiding: false,
      },
      {
        accessorKey: 'status',
        header: t('label.status'),
        size: 140,
        Cell: ({ cell }) => (
          <StatusCell
            cell={cell}
            statusMap={{
              [VaccinationCardItemNodeStatus.Given]: {
                color: theme.palette.vaccinationStatus.given,
                label: t('label.status-given'),
              },
              [VaccinationCardItemNodeStatus.NotGiven]: {
                color: theme.palette.vaccinationStatus.notGiven,
                label: t('label.status-not-given'),
              },
              [VaccinationCardItemNodeStatus.Pending]: {
                color: theme.palette.vaccinationStatus.pending,
                label: t('label.status-pending'),
              },
              [VaccinationCardItemNodeStatus.Late]: {
                color: theme.palette.vaccinationStatus.late,
                label: t('label.status-late'),
              },
            }}
          />
        ),
        enableHiding: false,
      },
      {
        id: 'suggestedDate',
        header: t('label.suggested-date'),
        size: 120,
        accessorFn: row => row.suggestedDate ?? '',
        columnType: ColumnType.Date,
      },
      {
        id: 'dateGiven',
        header: t('label.date-given'),
        size: 120,
        accessorFn: row =>
          row.status === VaccinationCardItemNodeStatus.Given
            ? (row.vaccinationDate ?? '')
            : '',
        columnType: ColumnType.Date,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
      },
      {
        accessorKey: 'facilityName',
        header: t('label.facility'),
      },
    ],
    [data]
  );

  const oldColumns = useColumns<VaccinationCardItemFragment>(
    [
      {
        key: 'age',
        label: 'label.age',
        sortable: false,
        accessor: ({ rowData }) => {
          const index =
            data?.items.findIndex(item => item.id === rowData.id) ?? 0;

          const sameAsPrev =
            rowData.minAgeMonths === data?.items?.[index - 1]?.minAgeMonths;

          // Only show age label for first of each "block", when repeated
          return sameAsPrev ? null : getAgeLabel(rowData);
        },
        // Hack for "min-content"
        width: '1%',
      },
      {
        key: 'label',
        label: 'label.dose',
        accessor: ({ rowData }) => rowData.label,
      },
      {
        key: 'status',
        label: 'label.status',
        accessor: ({ rowData }) => rowData.status,
        Cell: ({ ...props }) => (
          <StatusCellOld
            {...props}
            statusMap={{
              [VaccinationCardItemNodeStatus.Given]: {
                color: theme.palette.vaccinationStatus.given,
                label: t('label.status-given'),
              },
              [VaccinationCardItemNodeStatus.NotGiven]: {
                color: theme.palette.vaccinationStatus.notGiven,
                label: t('label.status-not-given'),
              },
              [VaccinationCardItemNodeStatus.Pending]: {
                color: theme.palette.vaccinationStatus.pending,
                label: t('label.status-pending'),
              },
              [VaccinationCardItemNodeStatus.Late]: {
                color: theme.palette.vaccinationStatus.late,
                label: t('label.status-late'),
              },
            }}
          />
        ),
      },
      {
        key: 'suggestedDate',
        label: 'label.suggested-date',
        accessor: ({ rowData }) => localisedDate(rowData.suggestedDate ?? ''),
      },
      {
        key: 'dateGiven',
        label: 'label.date-given',
        accessor: ({ rowData }) => {
          if (rowData.status === VaccinationCardItemNodeStatus.Given) {
            return localisedDate(rowData.vaccinationDate ?? '');
          } else {
            return null;
          }
        },
      },
      {
        key: 'batch',
        label: 'label.batch',
      },
      {
        key: 'facilityName',
        label: 'label.facility',
      },
    ],
    {},
    // Putting data/items into deps array so that status labels get recalculated
    // on changes
    [data]
  );

  const { table } = useNonPaginatedMaterialTable<VaccinationCardItemFragment>({
    tableId: 'vaccine-card-table',
    data: data?.items ?? [],
    columns,
    enableRowSelection: false,
    onRowClick: row => {
      if (canClickRow(isEncounter, row, data?.items, canSkipDose))
        openModal(row);
    },
    muiTableBodyRowProps: ({ row }) => ({
      sx: {
        cursor: canClickRow(isEncounter, row.original, data?.items, canSkipDose)
          ? 'pointer'
          : 'default',
        backgroundColor:
          row.original.status === VaccinationCardItemNodeStatus.Given
            ? theme.palette.background.success
            : undefined,
      },
    }),
  });

  return (
    <>
      {/* <DataTable
        id={'Vaccine Course List'}
        columns={oldColumns}
        data={data?.items ?? []}
        onRowClick={row => {
          if (canClickRow(isEncounter, row, data?.items, canSkipDose))
            openModal(row);
        }}
        noDataElement={<NothingHere body={t('error.no-items')} />}
      /> */}
      <MaterialTable table={table} />
    </>
  );
};

export const VaccineCardTable: FC<VaccinationCardProps> = props => {
  if (props.isLoading) return <InlineSpinner />;

  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore({
        initialSortBy: { key: 'name' },
      })}
    >
      <VaccinationCardComponent {...props} />
    </TableProvider>
  );
};
