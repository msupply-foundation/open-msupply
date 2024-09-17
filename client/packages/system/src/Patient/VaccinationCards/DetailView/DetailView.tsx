import React, { FC, useEffect } from 'react';
import {
  TableProvider,
  createTableStore,
  useBreadcrumbs,
  createQueryParamsStore,
  useParams,
  InlineSpinner,
  useTranslation,
  DataTable,
  useColumns,
  NothingHere,
  useIntlUtils,
  useFormatDateTime,
  useRowStyle,
  useTheme,
  StatusCell,
} from '@openmsupply-client/common';
import { usePatientVaccineCard } from '../../api/hooks/usePatientVaccineCard';
import { VaccinationCardItemFragment } from '../../api/operations.generated';

const useStyleRowsByStatus = (rows?: VaccinationCardItemFragment[]) => {
  const { setRowStyles } = useRowStyle();
  const theme = useTheme();

  useEffect(() => {
    if (!rows) return;

    const doneRows = rows.filter(row => row.given).map(row => row.id);
    const notDoneRows = rows.filter(row => !row.given).map(row => row.id);

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
  }, [rows]);
};

export const VaccinationCardComponent: FC = () => {
  const t = useTranslation('dispensary');
  const { programEnrolmentId = '' } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { localisedDate } = useFormatDateTime();
  const { getLocalisedFullName } = useIntlUtils();
  const theme = useTheme();

  const {
    query: { data, isLoading },
  } = usePatientVaccineCard(programEnrolmentId);

  useStyleRowsByStatus(data?.items);

  useEffect(() => {
    if (data)
      setCustomBreadcrumbs(
        {
          1: getLocalisedFullName(
            data?.patientFirstName,
            data?.patientLastName
          ),
          2: t('label.vaccination-card'),
          3: data?.programName,
        },
        [2]
      );
  }, [data]);

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
        noDataElement={<NothingHere body={t('error.no-items')} />}
      />
    </>
  );
};

export const VaccinationCardDetailView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore({
      initialSortBy: { key: 'name' },
    })}
  >
    <VaccinationCardComponent />
  </TableProvider>
);
