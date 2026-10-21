import { createMemo, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { DataTable } from '../../../../ui/elements/table/DataTable';
import { createTableConfig } from '../../../../api/createTableConfig';
import {
  encounterColumns,
  enrolmentNameByContext,
} from '../../../../domain/encounter/encounterColumns';
import type { EncounterRowFragment } from './programTabs.generated';

type Row = EncounterRowFragment;

export interface EncountersPanelProps {
  rows: Row[];
  loading: boolean;
  /** Opens the encounter's record screen. */
  onRowClick: (encounter: Row) => void;
  /** The enrolment registries, whose names the Program column shows. */
  enrolmentRegistries: readonly { contextId: string; name: string | null }[];
}

// The encounter table on the patient detail (spec/patients ui-surface ›
// Encounters tab), newest first: the encounter list's columns without Patient
// (spec/encounters/ui-surface.md S1). A row click navigates to the encounter's
// record screen (src/sections/encounters).
export const EncountersPanel: Component<EncountersPanelProps> = props => {
  const tableConfig = createTableConfig({
    tableId: 'patient-encounter-list',
  });

  const columns = createMemo(() =>
    encounterColumns<Row>({
      programName: enrolmentNameByContext(props.enrolmentRegistries),
    })
  );

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
