import { sortNodes } from '../../../../../standard_reports/utils';

// At least two decimals, up to four, so small pack prices are not rounded away
function formatPrice(value) {
  return withSeparators(value.toFixed(4).replace(/0{1,2}$/, ''));
}

// 1234567.5 -> 1,234,567.5
function withSeparators(text) {
  const [whole, fraction] = text.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

// A quantity to at most two decimals, with no trailing zeros
function formatQuantity(value) {
  return withSeparators(String(Math.round((value || 0) * 100) / 100));
}

function formatMoney(value) {
  return withSeparators((value || 0).toFixed(2));
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

    // Rounded so floating point noise (282.48 / 23.54) does not print
    const requestedNumberOfPacks =
      packSize > 0 ? Math.round((requestedUnits / packSize) * 100) / 100 : 0;
    // The line's stored total with the order's supplier discount apportioned
    // to it - the line cost the app shows, so the lines sum to the discounted
    // total
    const lineCost = node.lineTotalAfterSupplierDiscount || 0;

    node.lineCost = formatMoney(lineCost);
    node.pricePerPack = formatPrice(node.pricePerPackAfterSupplierDiscount || 0);
    node.requestedNumberOfPacks = requestedNumberOfPacks;
    node.packSizeText = formatQuantity(packSize);
    node.numberOfPacksText = formatQuantity(requestedNumberOfPacks);
    node.totalQuantityText = formatQuantity(requestedUnits);
  });

  const po = queryResponse.data.purchaseOrder;
  // The order's final cost, in its own currency, as the app shows it
  po.totalCost = po.orderTotalAfterDiscount || 0;
  // The exchange rate converts the order's currency to the store's
  po.estimatedCost = po.totalCost * (po.foreignExchangeRate || 1);
  // An order in the store's own currency needs no exchange rate or estimate
  const currencies = queryResponse.data.currencies;
  const homeCurrency =
    currencies && currencies.nodes && currencies.nodes[0]
      ? currencies.nodes[0].code
      : null;
  po.isForeignCurrency = !!po.currency && po.currency.code !== homeCurrency;
  po.totalCostText = formatMoney(po.totalCost);
  po.estimatedCostText = formatMoney(po.estimatedCost);
  po.supplierDiscountText = formatMoney(po.supplierDiscountAmount);

  const sorted = sortNodes(nodes, 'lineNumber', 'asc');
  const isService = node => !!node.item && node.item.type === 'SERVICE';
  po.lines.nodes = sorted.filter(node => !isService(node));
  po.charges = sorted.filter(isService).map(node => ({
    description: node.comment || (node.item && node.item.name) || '',
    amount: node.lineCost,
  }));
  // The supplier item code column prints only when a line has one
  po.hasSupplierItemCodes = po.lines.nodes.some(node => !!node.supplierItemCode);

  return queryResponse;
}

export { convert_data };
