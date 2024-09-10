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
  LocaleKey,
} from '@openmsupply-client/common';
import {
  usePatientVaccineCard,
  VaxCardData,
} from '../../api/hooks/usePatientVaccineCard';

export const VaccinationCardComponent: FC = () => {
  const t = useTranslation('dispensary');
  const { patientId = '', programEnrolmentId = '' } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const {
    query: { data, isLoading },
  } = usePatientVaccineCard(patientId, programEnrolmentId);

  const tableData = buildTableData(data);

  const columns = useColumns<DoseRowData>([
    {
      key: 'age',
      label: 'label.age',
      sortable: false,
      accessor: ({ rowData }) => `${rowData.age} months`, // TO-DO: express in years/months
    },
    {
      key: 'label',
      label: 'label.dose',
      accessor: ({ rowData }) => rowData?.label,
    },
    {
      key: 'status',
      label: 'label.status',
      accessor: ({ rowData }) => (rowData?.status ? t(rowData?.status) : ''),
      // Cell: DotCell,
    },
    {
      key: 'suggestedDate',
      label: 'label.suggested-date',
      accessor: ({ rowData }) => rowData?.suggestedDate,
      // Cell: DateCell, TO-DO
    },
    {
      key: 'dateGiven',
      label: 'label.date-given',
      accessor: ({ rowData }) => rowData?.dateGiven,
      // Cell: DateCell, TO-DO
    },
  ]);

  useEffect(() => {
    if (data)
      setCustomBreadcrumbs({
        1: data?.vaccineCardItems?.patient?.name ?? '',
        2: t('label.vaccination-card'),
        3: data?.vaccineCardItems?.programName,
      });
  }, []);

  return isLoading ? (
    <InlineSpinner />
  ) : (
    <>
      <DataTable
        id={'Vaccine Course List'}
        columns={columns ?? []}
        data={tableData ?? []}
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

interface DoseRowData {
  id: string;
  age: number;
  label: string;
  status: LocaleKey | null;
  suggestedDate?: Date;
  dateGiven?: Date;
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
      dateGiven: new Date(vaccination?.vaccinationDate ?? ''),
      // batch: TO-DO,
      // facility: TO-DO
    };
    return row;
  });
};
