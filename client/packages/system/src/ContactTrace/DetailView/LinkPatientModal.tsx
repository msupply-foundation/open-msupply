import React, { FC, useCallback, useEffect, useState } from 'react';
import {
  Box,
  DataTable,
  DetailContainer,
  DialogButton,
  SearchBar,
  TableProvider,
  useColumns,
  useDialog,
  useFormatDateTime,
  useTranslation,
  createTableStore,
} from '@openmsupply-client/common';
import {
  ChipTableCell,
  PatientRowFragment,
  programEnrolmentLabelAccessor,
  usePatient,
} from '../../Patient';
import { ContactTrace } from './useContactTraceData';

type Filter = {
  firstName?: string;
  lastName?: string;
  identifier?: string;
};

const useFilterBar = (
  onFilterChanged: (filter: Partial<Filter>) => void,
  firstName: string | undefined,
  lastName: string | undefined
): { filter: Filter; FilterBar: FC } => {
  const t = useTranslation('dispensary');
  const [filter, setFilter] = useState<Filter>({ firstName, lastName });
  useEffect(() => onFilterChanged(filter), [onFilterChanged, filter]);

  const FilterBar = () => (
    <Box display="flex" gap={1}>
      <SearchBar
        placeholder={t('placeholder.search-by-first-name')}
        value={filter.firstName ?? ''}
        onChange={(newValue: string) => {
          setFilter({
            ...filter,
            firstName: newValue,
          });
        }}
      />
      <SearchBar
        placeholder={t('placeholder.search-by-last-name')}
        value={filter.lastName ?? ''}
        onChange={(newValue: string) => {
          setFilter({ ...filter, lastName: newValue });
        }}
      />
      <SearchBar
        placeholder={t('placeholder.search-by-identifier')}
        value={filter.identifier ?? ''}
        onChange={(newValue: string) => {
          setFilter({ ...filter, identifier: newValue });
        }}
      />
    </Box>
  );

  return { filter, FilterBar };
};

type ModalContentProps = {
  documentData: ContactTrace;
  onPatientLinked: (patientId: string) => void;
  hideDialog: () => void;
};

const ModalContent: FC<ModalContentProps> = ({
  documentData,
  onPatientLinked,
  hideDialog,
}) => {
  const t = useTranslation('dispensary');
  const { localisedDate } = useFormatDateTime();
  const onFilterChanged = useCallback(() => {}, []);
  const { filter, FilterBar } = useFilterBar(
    onFilterChanged,
    documentData.contact?.firstName,
    documentData.contact?.lastName
  );

  const searchEnabled =
    (filter.firstName?.length ?? 0) > 0 ||
    (filter.lastName?.length ?? 0) > 0 ||
    (filter.identifier?.length ?? 0) > 0;
  const { data: localSearchData } = usePatient.document.list(
    {
      filterBy: {
        firstName: filter.firstName ? { like: filter.firstName } : null,
        lastName: filter.lastName ? { like: filter.lastName } : null,
        identifier: filter.identifier ? { like: filter.identifier } : null,
      },
    },
    searchEnabled
  );
  const matchingPatients = !searchEnabled ? [] : localSearchData?.nodes;

  const columns = useColumns<PatientRowFragment>([
    {
      key: 'firstName',
      label: 'label.first-name',
    },
    {
      key: 'lastName',
      label: 'label.last-name',
    },
    {
      key: 'dateOfBirth',
      label: 'label.date-of-birth',
      formatter: dateString =>
        dateString ? localisedDate((dateString as string) || '') : '',
    },
    {
      key: 'gender',
      label: 'label.gender',
    },
    {
      label: 'label.program-enrolments',
      key: 'programEnrolments',
      accessor: programEnrolmentLabelAccessor,
      Cell: ChipTableCell,
      maxWidth: 250,
    },
  ]);
  return (
    <TableProvider createStore={createTableStore}>
      <DetailContainer>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={2}
          width="100%"
        >
          <FilterBar />
          <DataTable
            dense
            id="create-patient-duplicates"
            data={matchingPatients ?? []}
            columns={columns}
            noDataMessage={
              searchEnabled
                ? t('messages.no-matching-patients')
                : t('messages.patient-data-required-for-search')
            }
            onRowClick={row => {
              onPatientLinked(row.id);
              hideDialog();
            }}
          />
        </Box>
      </DetailContainer>
    </TableProvider>
  );
};

export const useLinkPatientModal = (
  onPatientLinked: (patientId: string) => void
): {
  showDialog: () => void;
  hideDialog: () => void;

  LinkPatientModal: FC<{ documentData: ContactTrace }>;
} => {
  const t = useTranslation('dispensary');

  const { Modal, showDialog, hideDialog } = useDialog();

  const LinkPatientModal: FC<{ documentData: ContactTrace }> = ({
    documentData,
  }) => {
    return (
      <Modal
        title={t('title-link-contact-to-patient-modal')}
        sx={{ maxWidth: '90%', minWidth: '65%', height: '100%' }}
        cancelButton={<DialogButton variant="cancel" onClick={hideDialog} />}
        slideAnimation={false}
      >
        <ModalContent
          documentData={documentData}
          onPatientLinked={onPatientLinked}
          hideDialog={hideDialog}
        />
      </Modal>
    );
  };

  return {
    showDialog,
    hideDialog,
    LinkPatientModal,
  };
};
