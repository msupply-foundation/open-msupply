import { processStockLines } from "./utils";

function convert_data() {
  let res = JSON.parse(Host.inputString());
  res.stockLines.nodes = processStockLines(res.stockLines.nodes);
  Host.outputString(JSON.stringify(res));
}

module.exports = {
  convert_data,
};
