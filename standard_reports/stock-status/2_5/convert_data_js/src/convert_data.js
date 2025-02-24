import { processItemLines } from "./utils";

function convert_data() {
  const res = JSON.parse(Host.inputString());
  res.data.items.nodes = processItemLines(
    res.data.items.nodes,
    // assign default sort values
    res?.arguments?.sort ?? "name",
    res?.arguments?.dir ?? "asc"
  );
  Host.outputString(JSON.stringify(res));
}

module.exports = {
  convert_data,
};
