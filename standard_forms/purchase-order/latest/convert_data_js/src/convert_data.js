import { cleanUpNodes, sortNodes } from "../../../../../standard_reports/utils";

function convert_data(queryResponse) {
  let nodes = queryResponse.data.purchaseOrder.lines.nodes;
  for (let node in nodes) {
    let pricePerPack = nodes[node]["pricePerPackAfterDiscount"];
    let packSize = nodes[node]["requestedPackSize"];
    let unitQuantity = nodes[node]["requestedNumberOfUnits"];
    let numberOfPacks = packSize > 0 ? unitQuantity / packSize : 0;
    let lineCost = pricePerPack * numberOfPacks;
    nodes[node]["lineCost"] = lineCost.toFixed(2);

    nodes[node]["requestedNumberOfPacks"] = numberOfPacks;
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
