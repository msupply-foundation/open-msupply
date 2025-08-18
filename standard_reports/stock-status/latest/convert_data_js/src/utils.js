import { cleanUpNodes, sortNodes } from "../../../../utils";

const processItemLines = (nodes, sort, dir) => {
  let cleanNodes = cleanUpNodes(nodes);
  let removeBlankCodes = removeItemsWithBlankCodes(cleanNodes);
  let sortedNodes = sortNodes(cleanNodes, sort, dir);
  return sortedNodes;
};

const removeItemsWithBlankCodes = (itemNodes) => {
  let cleanNodes = [];

  itemNodes.forEach((node) => {
    // If we have any items without a valid code, we'll exclude them from the list
    if (Object.keys(node).length != 0 && node.code) {
      cleanNodes.push(cleanUpObject(node));
    }
  });
  return cleanNodes;
};

export { processItemLines };
