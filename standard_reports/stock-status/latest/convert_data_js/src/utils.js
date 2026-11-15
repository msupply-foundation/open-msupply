import { sortNodes } from '../../../../utils';

const processItemLines = (nodes, sort, dir) => {
  return sortNodes(nodes, sort, dir);
};

// Vaccine stock is held in vials (units); add the equivalent doses so readers
// don't convert by hand. Items with no doses per unit set count as 1 dose.
const addDoses = nodes => {
  return nodes.map(node => {
    if (!node.isVaccine) return node;
    const stockOnHand = node.stats?.stockOnHand ?? 0;
    return {
      ...node,
      dosesOnHand: Math.round(stockOnHand * (node.doses || 1)),
    };
  });
};

const hasVaccines = nodes => nodes.some(node => node.isVaccine);

export { processItemLines, addDoses, hasVaccines };
