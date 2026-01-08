import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Box,
  DetailContainer,
  DialogButton,
  SearchBar,
  useDialog,
  useTranslation,
  InputWithLabelRow,
  BasicTextInput,
  Grid,
  ButtonWithIcon,
  RewindIcon,
  ModalProps,
  MaterialTable,
  useSimpleMaterialTable,
  ColumnDef,
  ColumnType,
} from '@openmsupply-client/common';
import {
  PatientRowFragment,
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
  const t = useTranslation();

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
  linkedPatientId: string | undefined;
  setLinkedPatientId: (id?: string) => void;
  filter: Filter;
  onChangeFilter: (patch: Partial<Filter>) => void;
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
  filter,
  onChangeFilter,
  linkedPatientId,
  setLinkedPatientId,
}) => {
  const t = useTranslation();

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

  const matchingPatients = useMemo(
    () => (!searchEnabled ? [] : localSearchData?.nodes),
    [localSearchData?.nodes, searchEnabled]
  );

  const columns = useMemo(
    (): ColumnDef<PatientRowFragment>[] => [
      {
        accessorKey: 'firstName',
        header: t('label.first-name'),
      },
      {
        accessorKey: 'lastName',
        header: t('label.last-name'),
      },
      {
        accessorKey: 'dateOfBirth',
        header: t('label.date-of-birth'),
        columnType: ColumnType.Date,
      },
      {
        accessorKey: 'gender',
        header: t('label.gender'),
      },
      {
        id: 'programEnrolments',
        header: t('label.program-enrolments'),
        // TODO: Update for MRT
        // accessorFn: programEnrolmentLabelAccessor,
        // Cell: ChipTableCell,
        maxSize: 250,
      },
    ],
    []
  );
  const { data: linkedPatient } = usePatient.document.get(linkedPatientId);

  // TODO: test this table works now its using MRT
  const table = useSimpleMaterialTable<PatientRowFragment>({
    tableId: 'link-patient-contact-trace',
    columns,
    data: matchingPatients,
    onRowClick: row => setLinkedPatientId(row.id),
    getIsPlaceholderRow: row => row.id === linkedPatientId,
    noDataElement: searchEnabled
      ? t('messages.no-matching-patients-for-contact-trace')
      : t('messages.patient-data-required-for-search'),
  });

  return (
    <>
      <Grid
        container
        spacing={2}
        direction="row"
        justifyContent="space-between"
        bgcolor="background.toolbar"
        padding={3}
        paddingBottom={2}
        boxShadow={theme => theme.shadows[2]}
      >
        <Grid>
          <InputWithLabelRow
            label={t('label.linked-patient')}
            Input={
              <BasicTextInput
                disabled
                value={linkedPatient ? linkedPatient.name : ''}
              />
            }
          />
        </Grid>
        <Grid>
          <ButtonWithIcon
            Icon={<RewindIcon />}
            disabled={!linkedPatientId}
            onClick={() => setLinkedPatientId(undefined)}
            label={t('button.unlink-patient')}
          />
        </Grid>
      </Grid>
      <DetailContainer>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={2}
          width="100%"
        >
          <FilterBar onChange={onChangeFilter} filter={filter} />
          <MaterialTable table={table} />
        </Box>
      </DetailContainer>
    </>
  );
};

const LinkPatientModal = ({
  documentData,
  Modal,
  hideDialog,
  onPatientLinked,
}: {
  documentData: ContactTrace;
  Modal: FC<ModalProps>;
  hideDialog: () => void;
  onPatientLinked: (patientId?: string) => void;
}) => {
  const { filter, onChange } = useFilter(documentData);
  const [linkedPatientId, setLinkedPatientId] = useState(
    documentData?.contact?.id
  );

  return <>
    <Modal
      sx={{
        maxWidth: '90%',
        minWidth: '65%',
        height: '100%',
      }}
      title={''}
      contentProps={{ sx: { padding: 0 } }}
      cancelButton={<DialogButton variant="cancel" onClick={hideDialog} />}
      okButton={
        <DialogButton
          variant="ok"
          onClick={() => {
            onPatientLinked(linkedPatientId);
            hideDialog();
          }}
        />
      }
      slideAnimation={false}
    >
      <ModalContent
        documentData={documentData}
        linkedPatientId={linkedPatientId}
        setLinkedPatientId={setLinkedPatientId}
        onChangeFilter={onChange}
        filter={filter}
      />
    </Modal>
  </>;
};

export const useLinkPatientModal = (
  documentData: ContactTrace,
  onPatientLinked: (patientId?: string) => void
): {
  showDialog: () => void;
  hideDialog: () => void;

  LinkPatientModal: FC;
} => {
  const { Modal, showDialog, hideDialog } = useDialog();

  return {
    showDialog,
    hideDialog,
    LinkPatientModal: () => (
      <LinkPatientModal
        documentData={documentData}
        onPatientLinked={onPatientLinked}
        Modal={Modal}
        hideDialog={hideDialog}
      />
    ),
  };
};

// TODO: Update for MRT
// export const programEnrolmentLabelAccessor: ColumnDataAccessor<
//   PatientRowFragment,
//   string[]
// > = ({ rowData }): string[] => {
//   return rowData.programEnrolments.nodes.map(it => {
//     const programEnrolmentId = it.programEnrolmentId
//       ? ` (${it.programEnrolmentId})`
//       : '';
//     return `${it.document.documentRegistry?.name}${programEnrolmentId}`;
//   });
// };
