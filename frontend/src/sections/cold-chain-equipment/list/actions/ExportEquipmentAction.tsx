import { createResource, type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import {
  AssetsExport,
  type AssetsExportVariables,
} from '../../equipment.generated';
import { AssetPropertiesList } from '../../catalogue.generated';
import { equipmentToCsv } from '../equipmentToCsv';

// The equipment list Export action (ui-surface S1 § layout): the shared
// CSV/Excel split button, fed this vertical's own query. Delivery, the busy
// state and the outcome report all live in ListExportAction — this file owns
// only the query.
//
// The file is the list the user is looking at, unpaginated: the SAME filter the
// screen is reading through, so the destination's store restriction and every
// active filter chip both reach the file (rules › export, OMS-REG-CCE-07.13).

export const ExportEquipmentAction: Component<{
  storeId: string;
  isCentral: boolean;
  /**
   * The list's own filter, class pinning and store restriction included — not
   * a filter built here, which is how the export came to cover every store's
   * equipment (contract › export).
   */
  filter: AssetsExportVariables['filter'];
  /** The list's active sort — the export carries it (contract › export). */
  sort: AssetsExportVariables['sort'];
}> = props => {
  // The specification columns the file carries — the property catalogue's keys.
  // Read once, non-suspending: the export is an interaction on an already-open
  // screen (kdd/solid-reactivity-pitfalls § no remounts).
  const [propertyData] = createResource(async () => {
    const result = await graphqlFetch(AssetPropertiesList, {});
    return result.kind === 'success'
      ? result.data.assetProperties.nodes.map(node => node.key)
      : undefined;
  });

  const buildCsv = async (): Promise<string | null> => {
    const result = await graphqlFetch(AssetsExport, {
      storeId: props.storeId,
      filter: props.filter,
      // The list's own sort too, so the file reads in the order the user
      // arranged the register (contract › export).
      sort: props.sort,
    });
    if (result.kind !== 'success') return null;
    const nodes = result.data.assets.nodes;
    return nodes.length
      ? equipmentToCsv(nodes, gated(propertyData) ?? [], props.isCentral)
      : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.cold-chain-equipment')}
    />
  );
};
