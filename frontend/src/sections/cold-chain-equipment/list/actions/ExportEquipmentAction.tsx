import { createResource, type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import { CCE_CLASS_ID } from '../../equipment';
import { AssetsExport } from '../../equipment.generated';
import { AssetPropertiesList } from '../../catalogue.generated';
import { equipmentToCsv } from '../equipmentToCsv';

// The equipment list Export action (ui-surface S1 § layout): the shared
// CSV/Excel split button, fed this vertical's own query. Delivery, the busy
// state and the outcome report all live in ListExportAction — this file owns
// only the query.
//
// ⚠️ The export covers the WHOLE REGISTER, not the filtered list and not the
// active store's assets: its filter is `classId` alone (rules › export, AC-Z1,
// contract ⚠️ wire trap). Captured as-is from the reference app, and the one
// place this screen departs from the list-view standard — see BUILD_REPORT,
// which carries it as the vertical's first candidate spec refinement.

export const ExportEquipmentAction: Component<{
  storeId: string;
  isCentral: boolean;
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
      filter: { classId: { equalTo: CCE_CLASS_ID } },
      sort: [{ key: 'installationDate', desc: false }],
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
