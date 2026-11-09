import { sortNodes } from '../../../../utils';

const processStockLines = (nodes, sort, dir) => {
  return sortNodes(nodes, sort, dir);
};

// Vaccine stock is held in vials (units); add the equivalent doses so readers
// don't convert by hand. Items with no doses per unit set count as 1 dose.
const addDoses = nodes => {
  return nodes.map(node => {
    if (!node.item?.isVaccine) return node;
    const units = (node.totalNumberOfPacks ?? 0) * (node.packSize ?? 1);
    return {
      ...node,
      dosesOnHand: Math.round(units * (node.item.doses || 1)),
    };
  });
};

const hasVaccines = nodes => nodes.some(node => node.item?.isVaccine);

export { processStockLines, addDoses, hasVaccines };
