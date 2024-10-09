import React, { FC, useEffect } from 'react';
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
  StatusCell,
  VaccinationCardItemNodeStatus,
  useAuthContext,
  Alert,
  Box,
  UnhappyMan,
} from '@openmsupply-client/common';
import { usePatientVaccineCard } from '../api/usePatientVaccineCard';
import {
  VaccinationCardFragment,
  VaccinationCardItemFragment,
} from '../api/operations.generated';

interface VaccinationCardProps {
  programEnrolmentId: string;
  openModal: (
    vaccinationId: string | null | undefined,
    vaccineCourseDoseId: string
  ) => void;
  encounterId?: string;
}

const isPreviousDoseGiven = (
  row: VaccinationCardItemFragment,
  items: VaccinationCardItemFragment[] | undefined
) => {
  const vaccineCourseId = row.vaccineCourseId;
  if (!items) return false;
  const itemsForCourse = items.filter(
    item => item.vaccineCourseId === vaccineCourseId
  );
  const doseIndex = itemsForCourse.findIndex(dose => dose.id === row.id);
  if (doseIndex === 0) return true;
  return itemsForCourse[doseIndex - 1]?.given;
};

const includeRow = (
  includeNextDose: boolean,
  row: VaccinationCardItemFragment,
  items: VaccinationCardItemFragment[] | undefined
) => (includeNextDose || row.vaccinationId) && isPreviousDoseGiven(row, items);

const useStyleRowsByStatus = (
  rows: VaccinationCardItemFragment[] | undefined,
  isEncounter: boolean
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
      .filter(row => !includeRow(isEncounter, row, rows))
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
  const t = useTranslation('dispensary');
  const { localisedDate } = useFormatDateTime();
  const theme = useTheme();

  const isEncounter = !!encounterId;

  useStyleRowsByStatus(data?.items, isEncounter);

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

  const columns = useColumns<VaccinationCardItemFragment>(
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
        width: 140,
      },
      {
        key: 'label',
        label: 'label.dose',
        accessor: ({ rowData }) => rowData.label,
      },
      {
        key: 'status',
        label: 'label.status',
        accessor: ({ rowData }) =>
          // Only show label for existing vaccinations and the next editable row
          includeRow(true, rowData, data?.items) ? rowData.status : null,
        Cell: ({ ...props }) => (
          <StatusCell
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
        accessor: ({ rowData }) => localisedDate(rowData.vaccinationDate ?? ''),
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

  return (
    <>
      <DataTable
        id={'Vaccine Course List'}
        columns={columns}
        data={data?.items ?? []}
        onRowClick={row => {
          if (includeRow(isEncounter, row, data?.items))
            openModal(row.vaccinationId, row.vaccineCourseDoseId);
        }}
        noDataElement={<NothingHere body={t('error.no-items')} />}
      />
    </>
  );
};

export const VaccineCardTable: FC<VaccinationCardProps> = props => {
  const { storeId } = useAuthContext();
  const t = useTranslation();
  const {
    query: { data, isLoading },
  } = usePatientVaccineCard(props.programEnrolmentId);

  if (isLoading) return <InlineSpinner />;

  if (!!data?.enrolmentStoreId && data?.enrolmentStoreId !== storeId)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        width="100%"
        flexDirection="column"
      >
        <UnhappyMan />
        <Alert severity="info">
          {t('messages.cannot-view-vaccine-card', {
            programName: data?.programName,
          })}
        </Alert>
      </Box>
    );

  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore({
        initialSortBy: { key: 'name' },
      })}
    >
      <VaccinationCardComponent data={data} {...props} />
    </TableProvider>
  );
};
