import { sortNodes } from '../../../../../standard_reports/utils';

function convert_data(queryResponse) {
  let nodes = queryResponse.data.purchaseOrder.lines.nodes;

  if (!Array.isArray(nodes)) {
    nodes = Object.values(nodes).filter(
      value => typeof value === 'object' && value !== null
    );
  }

  nodes.forEach(node => {
    if (typeof node !== 'object' || node === null) {
      return;
    }

    const pricePerPack = node.pricePerPackAfterDiscount || 0;
    const packSize = node.requestedPackSize || 0;
    const requestedUnits = node.requestedNumberOfUnits || 0;
    const adjustedUnits = node.adjustedNumberOfUnits;

    const requestedNumberOfPacks = packSize > 0 ? requestedUnits / packSize : 0;

    // Use adjusted quantities for line cost if available, otherwise fall back to requested
    const unitsForCost = adjustedUnits != null ? adjustedUnits : requestedUnits;
    const packsForCost = packSize > 0 ? unitsForCost / packSize : 0;
    const lineCost = pricePerPack * packsForCost;

    node.lineCost = lineCost.toFixed(2);
    node.requestedNumberOfPacks = requestedNumberOfPacks;
    node.adjustedUnits = adjustedUnits != null ? adjustedUnits : '';
  });

  queryResponse.data.purchaseOrder.lines.nodes = sortNodes(
    nodes,
    'lineNumber',
    'asc'
  );

  return queryResponse;
}

export { convert_data };
