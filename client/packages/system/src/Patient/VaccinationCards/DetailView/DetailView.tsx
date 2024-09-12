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
} from '@openmsupply-client/common';
import { usePatientVaccineCard } from '../../api/hooks/usePatientVaccineCard';
import { VaccinationCardItemFragment } from '../../api/operations.generated';

export const VaccinationCardComponent: FC = () => {
  const t = useTranslation('dispensary');
  const { programEnrolmentId = '' } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { getLocalisedFullName } = useIntlUtils();
  const { localisedDate } = useFormatDateTime();

  const {
    query: { data, isLoading },
  } = usePatientVaccineCard(programEnrolmentId);

  const columns = useColumns<VaccinationCardItemFragment>([
    {
      key: 'age',
      label: 'label.age',
      sortable: false,
      accessor: ({ rowData }) => `${rowData.minAgeMonths} months`, // TO-DO: express in years/months
    },
    {
      key: 'label',
      label: 'label.dose',
      accessor: ({ rowData }) => rowData.label,
    },
    {
      key: 'status',
      label: 'label.status',
      accessor: ({ rowData }) => {
        switch (rowData.given) {
          case true:
            return t('label.status-given');
          case false:
            return t('label.status-not-given');
          default:
            return '';
        }
      },
    },
    {
      key: 'suggestedDate',
      label: 'label.suggested-date',
      accessor: ({ rowData }) => localisedDate(rowData.suggestedDate ?? ''),
      // Cell: DateCell, TO-DO
    },
    {
      key: 'dateGiven',
      label: 'label.date-given',
      accessor: ({ rowData }) => localisedDate(rowData.vaccinationDate ?? ''),
      // Cell: DateCell, TO-DO
    },
  ]);

  useEffect(() => {
    if (data)
      setCustomBreadcrumbs({
        1: getLocalisedFullName(data?.patientFirstName, data?.patientLastName),
        2: t('label.vaccination-card'),
        3: data?.programName,
      });
  }, [data]);

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
