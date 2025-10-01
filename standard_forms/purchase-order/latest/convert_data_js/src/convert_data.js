import { cleanUpNodes, sortNodes } from "../../../../../standard_reports/utils";

function convert_data(queryResponse) {
  let nodes = queryResponse.data.purchaseOrder.lines.nodes;
  for (let node in nodes) {
    let unitCost = nodes[node]["pricePerUnitAfterDiscount"];
    let unitQuantity = nodes[node]["requestedNumberOfUnits"];
    let lineCost = unitCost * unitQuantity;
    nodes[node]["lineCost"] = lineCost.toFixed(2);

    let packSize = nodes[node]["requestedPackSize"];
    let requestedPacks = packSize > 0 ? unitQuantity / packSize : 0;
    nodes[node]["requestedNumberOfPacks"] = requestedPacks;
  }

  // Clean and sort each line:
  let cleanNodes = cleanUpNodes(queryResponse.data.purchaseOrder.lines.nodes);
  queryResponse.data.purchaseOrder.lines.nodes = sortNodes(
    cleanNodes,
    "lineNumber",
    "asc"
  );

  return queryResponse;
}

export { convert_data };
