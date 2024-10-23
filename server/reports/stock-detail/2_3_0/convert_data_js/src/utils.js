import { cleanUpNodes, sortNodes } from "../../../../utils";

const processStockLines = (nodes, sort, dir) => {
  let cleanNodes = cleanUpNodes(nodes);
  let sortedNodes = sortNodes(cleanNodes, sort, dir);
  return sortedNodes;
};

module.exports = {
  processStockLines,
};
