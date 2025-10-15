import React, { FC, useMemo } from 'react';
import {
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  InlineSpinner,
  useTranslation,
  NothingHere,
  useTheme,
  VaccinationCardItemNodeStatus,
  useNonPaginatedMaterialTable,
  MaterialTable,
  ColumnDef,
  ColumnType,
} from '@openmsupply-client/common';
import { StatusCellNew } from '@openmsupply-client/common';
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

const VaccinationCardComponent = ({
  data,
  encounterId,
  openModal,
}: VaccinationCardProps & {
  data?: VaccinationCardFragment;
}) => {
  const t = useTranslation();
  const theme = useTheme();

  const isEncounter = !!encounterId;

  const canSkipDose = data?.items.some(item => item.canSkipDose) ?? false;

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
          <StatusCellNew
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
    noDataElement: <NothingHere body={t('error.no-items')} />,
  });

  return <MaterialTable table={table} />;
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
