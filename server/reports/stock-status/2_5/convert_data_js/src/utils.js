import { cleanUpNodes, sortNodes } from "../../../../utils";

const processItemLines = (nodes, sort, dir) => {
  let cleanNodes = cleanUpNodes(nodes);
  let sortedNodes = sortNodes(cleanNodes, sort, dir);
  return sortedNodes;
};

module.exports = {
  processItemLines,
};
