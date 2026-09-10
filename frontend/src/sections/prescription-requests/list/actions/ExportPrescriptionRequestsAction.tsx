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
import { PrescriptionRequests } from '../prescriptionRequests.generated';
import type { PrescriptionRequestsVariables } from '../prescriptionRequests.generated';
import type { PrescriptionRequestFilter } from '../listFilters';
import { prescriptionRequestsToCsv } from '../prescriptionRequestsToCsv';

// The prescription-requests list Export (spec/prescription-requests AC-L7):
// the shared CSV/Excel split button over EVERY row matching the current filter
// (all pages) — the custom-field filters among them, so the file's row set
// matches the screen's. Filenames follow the shared list-export rule with
// `filename.prescription-requests` as the list-name slot (ui-standards/
// list-views § regions). Delivery, the busy state and the outcome report live
// in ListExportAction — this file owns only the query.

export interface ExportPrescriptionRequestsActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => PrescriptionRequestFilter;
  /** The list's custom-field filter values — part of the active filters too. */
  customFieldFilter: () => CustomFieldFilterState | undefined;
  /**
   * The configured request custom fields — the list's trailing columns, which
   * the file carries as well, and the definitions a MULTI_OPTION filter
   * condition expands against.
   */
  customFields: () => CustomFieldDef[];
}

export const ExportPrescriptionRequestsAction: Component<
  ExportPrescriptionRequestsActionProps
> = props => {
  const buildCsv = async (): Promise<string | null> => {
    const variables: PrescriptionRequestsVariables = {
      storeId: props.storeId,
      filter: {
        ...stripEmpty(props.filter()),
        dynamicFilter: buildCustomFieldDynamicFilter(
          props.customFieldFilter(),
          props.customFields()
        ),
      },
      // One sort key only (the app-wide single-sort convention): the list's
      // default order — created datetime, newest first.
      sort: [{ key: 'createdDatetime', desc: true }],
    };
    const result = await graphqlFetch(PrescriptionRequests, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.prescriptionRequests.nodes;
    return nodes.length
      ? prescriptionRequestsToCsv(nodes, props.customFields())
      : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.prescription-requests')}
    />
  );
};
