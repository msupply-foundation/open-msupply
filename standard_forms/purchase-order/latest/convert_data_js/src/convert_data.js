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

    const requestedNumberOfPacks = packSize > 0 ? requestedUnits / packSize : 0;
    const lineCost = pricePerPack * requestedNumberOfPacks;

    node.lineCost = lineCost.toFixed(2);
    node.requestedNumberOfPacks = requestedNumberOfPacks;
  });

  const po = queryResponse.data.purchaseOrder;
  po.additionalFees =
    (po.agentCommission || 0) +
    (po.documentCharge || 0) +
    (po.communicationsCharge || 0) +
    (po.insuranceCharge || 0) +
    (po.freightCharge || 0);
  // The order's final cost, in its own currency, as the app shows it: the
  // charges are not part of either stored total, so they are added here
  po.totalCost = (po.orderTotalAfterDiscount || 0) + po.additionalFees;
  // The exchange rate converts the order's currency to the store's
  po.estimatedCost = po.totalCost * (po.foreignExchangeRate || 1);

  queryResponse.data.purchaseOrder.lines.nodes = sortNodes(
    nodes,
    'lineNumber',
    'asc'
  );

  return queryResponse;
}

export { convert_data };
