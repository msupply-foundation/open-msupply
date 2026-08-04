import { type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import { stripEmpty } from '@/typeHelpers';
import {
  buildCustomFieldDynamicFilter,
  type CustomFieldDef,
  type CustomFieldFilterState,
} from '@/domain/customFields';
import { Prescriptions } from '../prescriptions.generated';
import type { PrescriptionsVariables } from '../prescriptions.generated';
import type { PrescriptionFilter } from '../listFilters';
import { prescriptionsToCsv } from '../prescriptionsToCsv';

// The prescriptions list Export (spec/prescriptions OMS-REG-DIS-03.52): the
// shared CSV/Excel split button over EVERY row matching the current filter (all
// pages) — the custom-field filters among them, so the file's row set matches
// the screen's. Filenames follow the shared list-export rule with
// `filename.prescriptions` as the list-name slot (ui-standards/list-views §
// regions). Delivery, the busy state and the outcome report live in
// ListExportAction — this file owns only the query.

export interface ExportPrescriptionsActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => PrescriptionFilter;
  /** The list's custom-field filter values — part of the active filters too. */
  customFieldFilter: () => CustomFieldFilterState | undefined;
  /**
   * The configured prescription custom fields — the list's trailing columns,
   * which the file carries as well.
   */
  customFields: () => CustomFieldDef[];
}

export const ExportPrescriptionsAction: Component<
  ExportPrescriptionsActionProps
> = props => {
  const buildCsv = async (): Promise<string | null> => {
    const variables: PrescriptionsVariables = {
      storeId: props.storeId,
      filter: {
        ...stripEmpty(props.filter()),
        type: { equalTo: 'PRESCRIPTION' },
        dynamicFilter: buildCustomFieldDynamicFilter(props.customFieldFilter()),
      },
      // One sort key only (contract wire trap): the list's default order —
      // prescription date, newest first.
      sort: [{ key: 'invoiceDatetime', desc: true }],
    };
    const result = await graphqlFetch(Prescriptions, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.invoices.nodes;
    return nodes.length
      ? prescriptionsToCsv(nodes, props.customFields())
      : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.prescriptions')}
    />
  );
};
