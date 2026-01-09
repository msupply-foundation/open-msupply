import { sortNodes } from '../../../../utils';

const processStockLines = (nodes, sort, dir) => {
  let sortedNodes = sortNodes(nodes, sort, dir);
  return sortedNodes;
};

export { processStockLines };
