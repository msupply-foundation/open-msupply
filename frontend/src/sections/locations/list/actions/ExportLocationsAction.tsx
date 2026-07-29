import { type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import { stripEmpty } from '@/typeHelpers';
import { LocationsList } from '../locations.generated';
import type { LocationsListVariables } from '../locations.generated';
import type { LocationFilter } from '../listFilters';
import { locationsToCsv } from '../locationsToCsv';

// The locations list Export action (spec/locations S1, OMS-REG-INV-01.11): the
// shared CSV/Excel split button, fed this vertical's query. Exports EVERY
// location matching the current filter — all pages, not just the visible one
// (list-views § regions, D12). Delivery, the busy state and the outcome report
// live in ListExportAction — this file owns only the query.

export interface ExportLocationsActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => LocationFilter;
}

export const ExportLocationsAction: Component<
  ExportLocationsActionProps
> = props => {
  // Fetch every matching location (no page cap) and build the CSV. Returns
  // null when there's nothing to export. Sorted like the list's default (name
  // ascending — OMS-REG-INV-01.17) so the file reads like the screen.
  const buildCsv = async (): Promise<string | null> => {
    const variables: LocationsListVariables = {
      storeId: props.storeId,
      filter: stripEmpty(props.filter()),
      sort: [{ key: 'name' }],
    };
    const result = await graphqlFetch(LocationsList, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.locations.nodes;
    return nodes.length ? locationsToCsv(nodes) : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.locations')}
    />
  );
};
