import React, { FC, useEffect, useState } from 'react';
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

const FilterBar = ({
  filter,
  onChange,
}: {
  filter: Filter;
  onChange: (patch: Partial<Filter>) => void;
}) => {
  const t = useTranslation('dispensary');

  return (
    <Box display="flex" gap={1}>
      <SearchBar
        placeholder={t('placeholder.search-by-first-name')}
        value={filter.firstName ?? ''}
        onChange={newValue => onChange({ firstName: newValue })}
      />
      <SearchBar
        placeholder={t('placeholder.search-by-last-name')}
        value={filter.lastName ?? ''}
        onChange={newValue => onChange({ lastName: newValue })}
      />
      <SearchBar
        placeholder={t('placeholder.search-by-identifier')}
        value={filter.identifier ?? ''}
        onChange={newValue => {
          onChange({ identifier: newValue });
        }}
      />
    </Box>
  );
};

type ModalContentProps = {
  documentData: ContactTrace;
  onPatientLinked: (patientId: string) => void;
  hideDialog: () => void;
};

const useFilter = ({ contact }: ContactTrace) => {
  const [filter, setFilter] = useState<Filter>({
    firstName: contact?.firstName,
    lastName: contact?.lastName,
  });
  const [patch, setPatch] = useState<Partial<Filter>>({});

  useEffect(() => setFilter(f => ({ ...f, ...patch })), [patch]);

  return { filter, onChange: setPatch };
};

const ModalContent: FC<ModalContentProps> = ({
  documentData,
  onPatientLinked,
  hideDialog,
}) => {
  const t = useTranslation('dispensary');
  const { localisedDate } = useFormatDateTime();
  const { filter, onChange } = useFilter(documentData);

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
      sortBy: {
        key: 'name',
        direction: 'asc',
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
          <FilterBar onChange={onChange} filter={filter} />
          <DataTable
            dense
            id="create-patient-duplicates"
            data={matchingPatients ?? []}
            columns={columns}
            noDataMessage={
              searchEnabled
                ? t('messages.no-matching-patients-for-contact-trace')
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
