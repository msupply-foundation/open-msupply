import {
  useColumns,
  ColumnAlign,
  ColumnDescription,
  SortBy,
  ColumnDataAccessor,
  EncounterNodeStatus,
  DocumentRegistryCategoryNode,
} from '@openmsupply-client/common';
import { useFormatDateTime, useTranslation } from '@common/intl';
import {
  EncounterRowFragment,
  getStatusEventData,
  useDocumentRegistry,
} from '@openmsupply-client/programs';
import { getLogicalStatus } from '../utils';
import { ChipTableCell } from '../../Patient';

interface useEncounterListColumnsProps {
  onChangeSortBy: (sort: string, dir: 'desc' | 'asc') => void;
  sortBy: SortBy<EncounterRowFragment>;
  includePatient?: boolean;
}

const useEncounterAdditionalInfoAccessor: () => {
  additionalInfoAccessor: ColumnDataAccessor<EncounterRowFragment, string[]>;
} = () => {
  const t = useTranslation();
  return {
    additionalInfoAccessor: ({ rowData }): string[] => {
      const additionalInfo = getStatusEventData(
        rowData.activeProgramEvents.nodes
      );

      if (rowData?.status === EncounterNodeStatus.Pending) {
        const startDatetime = new Date(rowData?.startDatetime);
        const status = getLogicalStatus(startDatetime, t);
        if (status) {
          additionalInfo.push(status);
        }
      }

      return additionalInfo;
    },
  };
};

export const useEncounterListColumns = ({
  onChangeSortBy,
  sortBy,
  includePatient = false,
}: useEncounterListColumnsProps) => {
  const { localisedDate, localisedTime } = useFormatDateTime();
  const { data: enrolmentRegistries } =
    useDocumentRegistry.get.documentRegistries({
      filter: {
        category: {
          equalTo: DocumentRegistryCategoryNode.ProgramEnrolment,
        },
      },
    });
  includePatient;

  const { additionalInfoAccessor } = useEncounterAdditionalInfoAccessor();

  const columnList: ColumnDescription<EncounterRowFragment>[] = [
    {
      key: 'type',
      label: 'label.encounter-type',
      accessor: ({ rowData }) => rowData?.document.documentRegistry?.name,
    },
    {
      key: 'program',
      label: 'label.program',
      accessor: ({ rowData }) =>
        enrolmentRegistries?.nodes.find(
          it => it.contextId === rowData.contextId
        )?.name,
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
    label: 'label.additional-info',
    key: 'events',
    sortable: false,
    accessor: additionalInfoAccessor,
    Cell: ChipTableCell,
    minWidth: 400,
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
