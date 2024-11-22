import { processStockLines } from "./utils";

function convert_data() {
  const res = JSON.parse(Host.inputString());
  res.data.stockLines.nodes = processStockLines(
    res.data.stockLines.nodes,
    // assign default sort values
    res?.arguments?.sort ?? "item.name",
    res?.arguments?.dir ?? "desc"
  );
  Host.outputString(JSON.stringify(res));
}

module.exports = {
  convert_data,
};
