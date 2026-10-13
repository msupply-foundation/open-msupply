import { processItemLines, addDoses, hasVaccines } from './utils';

function convert_data(res) {
  res.data.items.nodes = addDoses(
    processItemLines(
      res.data.items.nodes,
      // assign default sort values
      res?.arguments?.sort ?? 'name',
      res?.arguments?.dir ?? 'asc'
    )
  );
  // only show the doses column when the report includes vaccines
  res.data.showDoses = hasVaccines(res.data.items.nodes);
  return res;
}

export { convert_data };
