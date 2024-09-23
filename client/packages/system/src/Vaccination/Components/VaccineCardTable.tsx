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
} from '@openmsupply-client/common';
import { usePatientVaccineCard } from '../api/usePatientVaccineCard';
import { VaccinationCardItemFragment } from '../api/operations.generated';

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

const isRowClickable = (
  isEncounter: boolean,
  row: VaccinationCardItemFragment,
  items: VaccinationCardItemFragment[] | undefined
) => (isEncounter || row.vaccinationId) && isPreviousDoseGiven(row, items);

const useStyleRowsByStatus = (
  rows: VaccinationCardItemFragment[] | undefined,
  isEncounter: boolean
) => {
  const { setRowStyles } = useRowStyle();
  const theme = useTheme();

  useEffect(() => {
    if (!rows) return;

    const doneRows = rows.filter(row => row.given).map(row => row.id);
    const notDoneRows = rows.filter(row => !row.given).map(row => row.id);
    const nonClickableRows = rows
      .filter(row => !isRowClickable(isEncounter, row, rows))
      .map(row => row.id);

    setRowStyles(doneRows, {
      backgroundColor: `${theme.palette.background.success} !important`,
    });
    setRowStyles(
      notDoneRows,
      {
        backgroundColor: 'white !important',
      },
      // Parameter to prevent the previous setRowStyles from being
      // reset/overwritten
      false
    );
    setRowStyles(
      nonClickableRows,
      {
        '& td': {
          cursor: 'default',
        },
        backgroundColor: 'white !important',
      },
      false
    );
  }, [rows]);
};

export const VaccinationCardComponent: FC<VaccinationCardProps> = ({
  programEnrolmentId,
  openModal,
  encounterId,
}) => {
  const t = useTranslation('dispensary');
  const { localisedDate } = useFormatDateTime();
  const theme = useTheme();

  const {
    query: { data, isLoading },
  } = usePatientVaccineCard(programEnrolmentId);

  const isEncounter = !!encounterId;

  useStyleRowsByStatus(data?.items, isEncounter);

  const columns = useColumns<VaccinationCardItemFragment>([
    {
      key: 'age',
      label: 'label.age',
      sortable: false,
      accessor: ({ rowData }) =>
        t('label.age-months-count', { count: rowData.minAgeMonths }),
    },
    {
      key: 'label',
      label: 'label.dose',
      accessor: ({ rowData }) => rowData.label,
    },
    {
      key: 'status',
      label: 'label.status',
      accessor: ({ rowData }) => rowData.given,
      Cell: ({ ...props }) => (
        <StatusCell
          {...props}
          statusMap={{
            true: {
              color: theme.palette.success.light,
              label: t('label.status-given'),
            },
            false: {
              color: theme.palette.error.main,
              label: t('label.status-not-given'),
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
  ]);

  return isLoading ? (
    <InlineSpinner />
  ) : (
    <>
      <DataTable
        id={'Vaccine Course List'}
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        onRowClick={row => {
          if (isRowClickable(isEncounter, row, data?.items))
            openModal(row.vaccinationId, row.vaccineCourseDoseId);
        }}
        noDataElement={<NothingHere body={t('error.no-items')} />}
      />
    </>
  );
};

export const VaccineCardTable: FC<VaccinationCardProps> = props => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore({
      initialSortBy: { key: 'name' },
    })}
  >
    <VaccinationCardComponent {...props} />
  </TableProvider>
);
