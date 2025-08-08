import { cleanUpNodes, sortNodes } from "../../../../../standard_reports/utils";

function convert_data(queryResponse) {
  // Add a lineCost field to each line:
  let nodes = queryResponse.data.purchaseOrder.lines.nodes;
  for (let node in nodes) {
    let unitCost = nodes[node]["pricePerUnitAfterDiscount"];
    let unitQuantity = nodes[node]["requestedNumberOfUnits"];
    let lineCost = unitCost * unitQuantity;
    nodes[node]["lineCost"] = lineCost.toFixed(2);
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
