import { sortNodes } from '../../../../../standard_reports/utils';

// At least two decimals, up to four, so small pack prices are not rounded away
function formatPrice(value) {
  return value.toFixed(4).replace(/0{1,2}$/, '');
}

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

    const packSize = node.requestedPackSize || 0;
    const requestedUnits = node.requestedNumberOfUnits || 0;

    const requestedNumberOfPacks = packSize > 0 ? requestedUnits / packSize : 0;
    // The line's stored total with the order's supplier discount apportioned
    // to it - the line cost the app shows, so the lines sum to the discounted
    // total
    const lineCost = node.lineTotalAfterSupplierDiscount || 0;

    node.lineCost = lineCost.toFixed(2);
    node.pricePerPack = formatPrice(node.pricePerPackAfterSupplierDiscount || 0);
    node.requestedNumberOfPacks = requestedNumberOfPacks;
  });

  const po = queryResponse.data.purchaseOrder;
  // The order's final cost, in its own currency, as the app shows it
  po.totalCost = po.orderTotalAfterDiscount || 0;
  // The exchange rate converts the order's currency to the store's
  po.estimatedCost = po.totalCost * (po.foreignExchangeRate || 1);

  const sorted = sortNodes(nodes, 'lineNumber', 'asc');
  const isService = node => !!node.item && node.item.type === 'SERVICE';
  po.lines.nodes = sorted.filter(node => !isService(node));
  po.charges = sorted.filter(isService).map(node => ({
    description: node.comment || (node.item && node.item.name) || '',
    amount: node.lineCost,
  }));

  return queryResponse;
}

export { convert_data };
