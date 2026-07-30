import { type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import { stripEmpty } from '@/typeHelpers';
import { Prescriptions } from '../prescriptions.generated';
import type { PrescriptionsVariables } from '../prescriptions.generated';
import type { PrescriptionFilter } from '../listFilters';
import { prescriptionsToCsv } from '../prescriptionsToCsv';

// The prescriptions list Export (spec/prescriptions AC-L4): the shared
// CSV/Excel split button over EVERY row matching the current filter (all
// pages). Filenames follow the shared list-export rule with
// `filename.prescriptions` as the list-name slot (ui-standards/list-views §
// regions). Delivery, the busy state and the outcome report live in
// ListExportAction — this file owns only the query.

export interface ExportPrescriptionsActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => PrescriptionFilter;
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
      },
      // One sort key only (contract wire trap): the list's default order —
      // prescription date, newest first.
      sort: [{ key: 'invoiceDatetime', desc: true }],
    };
    const result = await graphqlFetch(Prescriptions, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.invoices.nodes;
    return nodes.length ? prescriptionsToCsv(nodes) : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.prescriptions')}
    />
  );
};
