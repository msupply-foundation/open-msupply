import { type Component } from 'solid-js';
import { t } from '../../../../intl';
import type { LocaleKey } from '../../../../intl/locales';
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
import type { EncounterRowFragment } from './programTabs.generated';

type Row = EncounterRowFragment;

export interface EncountersPanelProps {
  rows: Row[];
  loading: boolean;
  /** Navigate to the encounter — the route the encounters vertical will own. */
  onRowClick: (encounter: Row) => void;
}

// Encounter status → its fixed label key (matches the reference's
// encounterStatusTranslation; PENDING renders as "Scheduled").
const statusLabel = (status: Row['status']): string =>
  status
    ? t(`label.encounter-status-${status.toLowerCase()}` as LocaleKey)
    : '';

// The read-only encounter table on the patient detail (spec/patients ui-surface
// › Encounters tab), newest first. Unlike the Programs/Vaccinations tabs, a row
// click NAVIGATES to the encounter route (owned by the encounters vertical,
// built later) rather than opening a document form — so rows are clickable
// here. Type/Program names are the document registry names.
export const EncountersPanel: Component<EncountersPanelProps> = props => {
  const tableConfig = createTableConfig({
    tableId: 'patient-encounter-list',
  });

  // Cell-type presets carry the rendering AND the width
  // (ui/docs/CELL_TYPES.md): the start date from the shared CELL_DEF map, the
  // text columns from the text helper plus a call-site `size` (no map key).
  const columns = (): Column<Row, never>[] => [
    {
      c: {
        accessor: r => r.document.documentRegistry?.name ?? r.type,
        id: 'type',
      },
      header: () => t('label.encounter-type'),
      ...getTextCell(),
      size: remToPx(14),
    },
    {
      c: {
        accessor: r =>
          r.programEnrolment?.document.documentRegistry?.name ?? '',
        id: 'program',
      },
      header: () => t('label.program'),
      ...getTextCell(),
      size: remToPx(14),
    },
    {
      c: { key: 'startDatetime' },
      header: () => t('label.date'),
      ...getCellDefinition('startDatetime'),
    },
    {
      c: { accessor: r => statusLabel(r.status), id: 'status' },
      header: () => t('label.status'),
      ...getTextCell(),
      size: remToPx(6),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={props.rows}
      rowKey={r => r.id}
      loading={props.loading}
      onRowClick={props.onRowClick}
      emptyMessage={t('messages.no-encounters')}
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
