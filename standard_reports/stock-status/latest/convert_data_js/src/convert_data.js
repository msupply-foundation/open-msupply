import { processItemLines } from './utils';

function convert_data(res) {
  res.data.items.nodes = processItemLines(
    res.data.items.nodes,
    // assign default sort values
    res?.arguments?.sort ?? 'name',
    res?.arguments?.dir ?? 'asc'
  );
  return res;
}

export { convert_data };
