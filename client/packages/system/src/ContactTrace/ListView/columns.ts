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
      key: 'datetime',
      label: 'label.date',
      formatter: dateString =>
        dateString ? localisedDate((dateString as string) || '') : '',
    },
    {
      key: 'firstName',
      label: 'label.first-name',
    },
    {
      key: 'lastName',
      label: 'label.last-name',
    },
    {
      key: 'age',
      label: 'label.age',
      align: ColumnAlign.Right,
      width: 175,
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
