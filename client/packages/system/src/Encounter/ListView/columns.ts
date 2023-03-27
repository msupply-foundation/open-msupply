import {
  useColumns,
  ColumnAlign,
  Column,
  ColumnDescription,
  SortBy,
  ProgramEnrolmentNodeStatus,
} from '@openmsupply-client/common';
import { useFormatDateTime, useTranslation } from '@common/intl';
import {
  ProgramEventFragment,
  EncounterRowFragment,
  useDocumentRegistry,
  useProgramEnrolments,
} from '@openmsupply-client/programs';
import { getStatusTranslation } from '../../Patient/ProgramEnrolment/utils';

const encounterEventCellValue = (events: ProgramEventFragment[]) => {
  // just take the name of the first event
  return events[0]?.data ?? '';
};

interface useEncounterListColumnsProps {
  onChangeSortBy: (column: Column<any>) => void;
  sortBy: SortBy<EncounterRowFragment>;
  includePatient?: boolean;
}

export const useEncounterListColumns = ({
  onChangeSortBy,
  sortBy,
  includePatient = false,
}: useEncounterListColumnsProps) => {
  const { localisedDate, localisedTime } = useFormatDateTime();
  const t = useTranslation('patients');
  const { data: documentRegistries } =
    useDocumentRegistry.get.documentRegistries();
  const { data: programEnrolments } =
    useProgramEnrolments.document.programEnrolments({});
  includePatient;

  const columnList: ColumnDescription<EncounterRowFragment>[] = [
    {
      key: 'encounter-type',
      label: 'label.encounter-type',
      sortable: false,
      accessor: ({ rowData }) => rowData?.document.documentRegistry?.name,
    },
    {
      key: 'program',
      label: 'label.program',
      accessor: ({ rowData }) => {
        return documentRegistries?.nodes?.find(
          node => node.documentType === rowData.program
        )?.name;
      },
    },
    {
      key: 'startDatetime',
      label: 'label.date',
      accessor: ({ rowData }) => rowData?.startDatetime,
      formatter: dateString =>
        dateString ? localisedDate((dateString as string) || '') : '',
    },
    {
      key: 'startTime',
      label: 'label.encounter-start',
      sortable: false,
      accessor: ({ rowData }) => rowData?.startDatetime,
      formatter: dateString =>
        dateString ? localisedTime((dateString as string) || '') : '',
    },
    {
      key: 'endDatetime',
      label: 'label.encounter-end',
      formatter: dateString =>
        dateString ? localisedTime((dateString as string) || '') : '',
    },
  ];
  if (includePatient)
    columnList.push({
      key: 'patientId',
      label: 'label.patient',
      accessor: ({ rowData }) => rowData?.patient?.name,
    });
  columnList.push({
    key: 'events',
    label: 'label.additional-info',
    sortable: false,
    formatter: events =>
      encounterEventCellValue((events as ProgramEventFragment[]) ?? []),
  });
  columnList.push({
    key: 'events',
    label: 'label.program-status',
    sortable: false,
    accessor: ({ rowData }) => {
      const status = programEnrolments?.nodes?.find(
        node =>
          node.patientId === rowData.patient.id &&
          node.program === rowData.program
      )?.status;

      return t(
        getStatusTranslation(status ?? ProgramEnrolmentNodeStatus.Active)
      );
    },
  });
  columnList.push({
    key: 'effectiveStatus',
    label: 'label.status',
    sortable: false,
    align: ColumnAlign.Right,
    width: 175,
  });

  const columns = useColumns<EncounterRowFragment>(
    columnList,
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  return columns;
};
