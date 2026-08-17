import { type Component } from 'solid-js';
import { t } from '../../../../intl';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getTextCell,
} from '../../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../../ui/utils/rem';
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

  // Cell-type presets carry the rendering AND the width
  // (ui/docs/CELL_TYPES.md): the enrolment date from the shared CELL_DEF map,
  // the three text columns from the text helper plus a call-site `size` (no map
  // key), each sized to its header label.
  const columns = (): Column<Row, never>[] => [
    {
      c: {
        accessor: r => r.document.documentRegistry?.name ?? r.type,
        id: 'program',
      },
      header: () => t('label.enrolment-program'),
      ...getTextCell(),
      size: remToPx(14),
    },
    {
      c: {
        accessor: r => r.programEnrolmentId ?? '',
        id: 'programEnrolmentId',
      },
      header: () => t('label.enrolment-patient-id'),
      ...getTextCell(),
      size: remToPx(11),
    },
    {
      c: { accessor: r => r.status ?? '', id: 'status' },
      header: () => t('label.program-status'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      c: { key: 'enrolmentDatetime' },
      header: () => t('label.enrolment-datetime'),
      ...getCellDefinition('enrolmentDatetime'),
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
      configIsDefault={tableConfig.isConfigDefault()}
      onSaveGlobalDefault={
        tableConfig.canSaveGlobalDefault()
          ? tableConfig.saveGlobalTableConfig
          : undefined
      }
    />
  );
};
