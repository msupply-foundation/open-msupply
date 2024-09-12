import React, { FC, useEffect, useMemo } from 'react';
import {
  TableProvider,
  createTableStore,
  useBreadcrumbs,
  useParams,
  InlineSpinner,
  useTranslation,
  DataTable,
  useColumns,
  NothingHere,
  LocaleKey,
  useFormatDateTime,
  useRowStyle,
  useTheme,
  StatusCell,
} from '@openmsupply-client/common';
import {
  usePatientVaccineCard,
  VaxCardData,
} from '../../api/hooks/usePatientVaccineCard';

const useStyleRowsByStatus = (rows: DoseRowData[]) => {
  const { setRowStyles } = useRowStyle();
  const theme = useTheme();

  useEffect(() => {
    if (!rows) return;

    setRowStyles(
      rows.filter(row => !!row.dateGiven).map(row => row.id),
      {
        backgroundColor: `${theme.palette.background.success} !important`,
      }
    );
  }, [rows]);
};

export const VaccinationCardComponent: FC = () => {
  const t = useTranslation('dispensary');
  const { patientId = '', programEnrolmentId = '' } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { localisedDate } = useFormatDateTime();
  const theme = useTheme();

  const {
    query: { data, isLoading },
  } = usePatientVaccineCard(patientId, programEnrolmentId);

  const tableData = useMemo(() => buildTableData(data), [data]);

  useStyleRowsByStatus(tableData);

  useEffect(() => {
    if (data) {
      setCustomBreadcrumbs({
        1: data?.vaccineCardItems?.patient?.name ?? '',
        2: t('label.vaccination-card'),
        3: data?.vaccineCardItems?.programName,
      });
    }
  }, [data]);

  const columns = useColumns<DoseRowData>([
    {
      key: 'age',
      label: 'label.age',
      sortable: false,
      accessor: ({ rowData }) =>
        t('label.age-months-count', { count: rowData.age }),
    },
    {
      key: 'label',
      label: 'label.dose',
      accessor: ({ rowData }) => rowData?.label,
    },
    {
      key: 'status',
      label: 'label.status',
      accessor: ({ rowData }) => rowData?.status,
      Cell: ({ ...props }) => (
        <StatusCell
          {...props}
          statusMap={{
            'label.status-given': {
              color: theme.palette.success.light,
              label: t('label.status-given'),
            },
            'label.status-not-given': {
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
      accessor: ({ rowData }) => localisedDate(rowData?.suggestedDate ?? ''),
    },
    {
      key: 'dateGiven',
      label: 'label.date-given',
      accessor: ({ rowData }) => localisedDate(rowData?.dateGiven ?? ''),
    },
  ]);

  return isLoading ? (
    <InlineSpinner />
  ) : (
    <>
      <DataTable
        id={'Vaccine Course List'}
        columns={columns}
        data={tableData ?? []}
        isLoading={isLoading}
        noDataElement={<NothingHere body={t('error.no-items')} />}
      />
    </>
  );
};

export const VaccinationCardDetailView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <VaccinationCardComponent />
  </TableProvider>
);

interface DoseRowData {
  id: string;
  age: number;
  label: string;
  status: LocaleKey | null;
  suggestedDate?: Date;
  dateGiven?: Date | null;
  // batch: string
  // facility: string
}
const buildTableData = (rawData: VaxCardData): DoseRowData[] => {
  return rawData.vaccineCardItems.nodes.map(dose => {
    const { vaccineCourseDose, vaccination } = dose;
    const row = {
      id: vaccineCourseDose.id,
      age: vaccineCourseDose.minAgeMonths,
      label: vaccineCourseDose.label,
      status: vaccination
        ? vaccination.given
          ? ('label.status-given' as LocaleKey)
          : ('label.status-not-given' as LocaleKey)
        : null,
      suggestedDate: undefined,
      dateGiven: vaccination?.vaccinationDate
        ? new Date(vaccination?.vaccinationDate)
        : null,
      // batch: TO-DO,
      // facility: TO-DO
    };
    return row;
  });
};
