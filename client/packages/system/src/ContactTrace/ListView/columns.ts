import {
  useColumns,
  ColumnAlign,
  Column,
  SortBy,
  ColumnDescription,
} from '@openmsupply-client/common';
import { useFormatDateTime } from '@common/intl';
import { ContactTraceRowFragment } from '@openmsupply-client/programs';

export interface ContactTraceListColumnsProps {
  onChangeSortBy: (column: Column<ContactTraceRowFragment>) => void;
  sortBy: SortBy<ContactTraceRowFragment>;
  includePatient?: boolean;
}

export const useContactTraceListColumns = ({
  onChangeSortBy,
  sortBy,
  includePatient,
}: ContactTraceListColumnsProps) => {
  const { localisedDate } = useFormatDateTime();

  const columnList: ColumnDescription<ContactTraceRowFragment>[] = [];
if (includePatient) {
    columnList.push({
      key: 'patientName',
      label: 'label.patient',
      accessor: ({ rowData }) => rowData?.patient?.name,
      sortable: false,
    });
  }
  columnList.push(
    {
      key: 'programName',
      label: 'label.program',
      accessor: ({ rowData }) => rowData.program.name,
      sortable: false,
    },
    {
      key: 'contactTraceId',
      label: 'label.contact_trace-id',
    },
    {
      key: 'contactPatientName',
      label: 'label.contact-patient',
      accessor: ({ rowData }) => rowData?.contactPatient?.name,
      sortable: false,
    },
    {
      key: 'status',
      label: 'label.status',
    },
    {
      key: 'datetime',
      label: 'label.date',
      align: ColumnAlign.Right,
      width: 175,
      formatter: dateString =>
        dateString ? localisedDate((dateString as string) || '') : '',
    }
  );

  const columns = useColumns<ContactTraceRowFragment>(
    columnList,
    {
      sortBy,
      onChangeSortBy,
    },
    [sortBy, onChangeSortBy]
  );

  return columns;
};
