import { processStockLines, addDoses, hasVaccines } from './utils';

function convert_data(res) {
  res.data.stockLines.nodes = addDoses(
    processStockLines(
      res.data.stockLines.nodes,
      // assign default sort values
      res?.arguments?.sort ?? 'item.name',
      res?.arguments?.dir ?? 'asc'
    )
  );
  // only show the doses column when the report includes vaccines
  res.data.showDoses = hasVaccines(res.data.stockLines.nodes);
  return res;
}

export { convert_data };
