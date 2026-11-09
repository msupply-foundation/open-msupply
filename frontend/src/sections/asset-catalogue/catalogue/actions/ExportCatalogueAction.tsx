import { type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import { stripEmpty } from '@/typeHelpers';
import {
  AssetCatalogueItems,
  type AssetCatalogueItemsVariables,
} from '../catalogue.generated';
import type { CatalogueFilter } from '../catalogueFilters';
import { catalogueToCsv } from '../catalogueToCsv';

// Export (spec/asset-catalogue › rules § export): the shared CSV/Excel split
// button, fed every item matching the list's active filters, across all pages,
// in the list's order. A read, so offered on every server.

export interface ExportCatalogueActionProps {
  storeId: string;
  filter: () => CatalogueFilter;
  sort: () => AssetCatalogueItemsVariables['sort'];
}

export const ExportCatalogueAction: Component<
  ExportCatalogueActionProps
> = props => {
  const buildCsv = async (): Promise<string | null> => {
    // No page: the server then returns every matching item.
    const result = await graphqlFetch(AssetCatalogueItems, {
      filter: stripEmpty(props.filter()),
      sort: props.sort(),
    });
    if (result.kind !== 'success') return null;
    const nodes = result.data.assetCatalogueItems.nodes;
    return nodes.length ? catalogueToCsv(nodes) : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.asset-categories')}
    />
  );
};
