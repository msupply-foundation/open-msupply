import { type Component } from 'solid-js';
import { t } from '../../../../intl';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import { getDateCell } from '../../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../../api/createTableConfig';
import type { ProgramEnrolmentRowFragment } from './programTabs.generated';

type Row = ProgramEnrolmentRowFragment;

export interface ProgramEnrolmentsPanelProps {
  rows: Row[];
  loading: boolean;
  /** tableId + empty copy differ between the Programs and Vaccinations tabs. */
  tableId: string;
  emptyMessage: string;
}

// The read-only program-enrolment table shared by the Programs tab (all
// enrolments) and the Vaccinations tab (immunisation enrolments only — filtered
// by the caller) — spec/patients ui-surface › Programs / Vaccinations tabs.
// Rows are NOT clickable: opening an enrolment (or its vaccination card) needs
// the JSON-schema document form / card surfaces owned by other verticals, which
// are out of scope here. The program name is the document registry name.
export const ProgramEnrolmentsPanel: Component<
  ProgramEnrolmentsPanelProps
> = props => {
  const tableConfig = createTableConfig({ tableId: props.tableId });

  const columns = (): Column<Row, never>[] => [
    {
      c: {
        accessor: r => r.document.documentRegistry?.name ?? r.type,
        id: 'program',
      },
      header: t('label.enrolment-program'),
    },
    {
      c: {
        accessor: r => r.programEnrolmentId ?? '',
        id: 'programEnrolmentId',
      },
      header: t('label.enrolment-patient-id'),
    },
    {
      c: { accessor: r => r.status ?? '', id: 'status' },
      header: t('label.program-status'),
    },
    {
      c: { key: 'enrolmentDatetime' },
      header: t('label.enrolment-datetime'),
      ...getDateCell(),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={props.rows}
      rowKey={r => r.id}
      loading={props.loading}
      emptyMessage={props.emptyMessage}
      config={tableConfig.config()}
      setConfig={tableConfig.setConfig}
      onSaveGlobalDefault={
        tableConfig.canSaveGlobalDefault()
          ? tableConfig.saveGlobalTableConfig
          : undefined
      }
    />
  );
};
