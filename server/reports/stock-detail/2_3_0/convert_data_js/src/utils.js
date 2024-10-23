import { cleanUpNodes, sortNodes } from "../../../../utils";

const processItemLines = (data, sort, dir) => {
  let cleanNodes = cleanUpNodes(data.items.nodes);
  let sortedNodes = sortNodes(cleanNodes, sort, dir);
  return sortedNodes;
};

module.exports = {
  processItemLines,
};
