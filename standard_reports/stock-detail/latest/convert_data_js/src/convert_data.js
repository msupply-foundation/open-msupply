import { processStockLines } from './utils';

function convert_data(res) {
  res.data.stockLines.nodes = processStockLines(
    res.data.stockLines.nodes,
    // assign default sort values
    res?.arguments?.sort ?? 'item.name',
    res?.arguments?.dir ?? 'asc'
  );
  return res;
}

export { convert_data };
