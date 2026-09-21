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
// The file carries the screen's active filters, unpaginated — but NOT the
// destination's store restriction: an export is a register-wide extract, so it
// covers every store's equipment from either destination, narrowed only by the
// chips the user set (rules › export, OMS-REG-CCE-07.13/.33).

export const ExportEquipmentAction: Component<{
  storeId: string;
  isCentral: boolean;
  /**
   * Exactly what the LIST is reading — `buildListFilter`, never a filter built
   * here. The file is what the screen shows, store restriction included
   * (contract › export).
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
