import { processStockLines } from "./utils";

function convert_data() {
  let res = JSON.parse(Host.inputString());
  res.data.stockLines.nodes = processStockLines(
    res.data.stockLines.nodes,
    // assign default sort values
    res?.arguments?.sort ?? "SOH",
    res?.arguments?.dir ?? "desc"
  );
  Host.outputString(JSON.stringify(res));
}

module.exports = {
  convert_data,
};
