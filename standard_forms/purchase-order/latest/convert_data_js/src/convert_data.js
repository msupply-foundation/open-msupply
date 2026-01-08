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
    const unitQuantity = node.requestedNumberOfUnits || 0;

    const numberOfPacks = packSize > 0 ? unitQuantity / packSize : 0;
    const lineCost = pricePerPack * numberOfPacks;

    node.lineCost = lineCost.toFixed(2);
    node.requestedNumberOfPacks = numberOfPacks;
  });

  queryResponse.data.purchaseOrder.lines.nodes = sortNodes(
    nodes,
    'lineNumber',
    'asc'
  );

  return queryResponse;
}

export { convert_data };
