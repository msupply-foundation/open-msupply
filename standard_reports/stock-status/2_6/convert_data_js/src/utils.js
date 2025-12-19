import { sortNodes } from '../../../../utils';

const processItemLines = (nodes, sort, dir) => {
  let sortedNodes = sortNodes(nodes, sort, dir);
  return sortedNodes;
};

export { processItemLines };
