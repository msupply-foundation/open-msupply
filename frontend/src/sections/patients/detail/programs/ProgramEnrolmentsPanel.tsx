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
import { getChipListCell } from '../../../../ui/elements/table/ChipListCell';
import { remToPx } from '../../../../ui/utils/rem';
import { statusEventTexts } from '../../../../domain/program/programEvents';
import { createTableConfig } from '../../../../api/createTableConfig';
import type { ProgramEnrolmentRowFragment } from './programTabs.generated';

type Row = ProgramEnrolmentRowFragment;

export interface ProgramEnrolmentsPanelProps {
  rows: Row[];
  loading: boolean;
  /** tableId + empty copy differ between the Programs and Vaccinations tabs. */
  tableId: string;
  emptyMessage: string;
  /**
   * Opens the enrolment: the Programs tab's row opens it in the enrolment
   * modal, the Vaccinations tab's row opens its vaccination card.
   */
  onRowClick?: (enrolment: Row) => void;
  /**
   * The Additional info column, the enrolment's status events: the Programs
   * tab shows it, the Vaccinations tab does not.
   */
  showAdditionalInfo?: boolean;
}

// The program-enrolment table shared by the Programs tab (all enrolments) and
// the Vaccinations tab (immunisation enrolments only — filtered by the caller)
// — spec/patients ui-surface › Programs / Vaccinations tabs. A row opens its
// enrolment only where the caller passes `onRowClick`. The program name is the
// document registry name; the Additional info column (Programs only) shows the
// enrolment's active status events (spec/encounters/rules.md § additional
// information).
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
    ...(props.showAdditionalInfo
      ? [
          {
            c: {
              accessor: r => statusEventTexts(r.activeProgramEvents.nodes),
              id: 'additionalInfo',
            },
            header: () => t('label.additional-info'),
            ...getChipListCell(),
            size: remToPx(18),
          } satisfies Column<Row, never>,
        ]
      : []),
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
      onRowClick={props.onRowClick}
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
