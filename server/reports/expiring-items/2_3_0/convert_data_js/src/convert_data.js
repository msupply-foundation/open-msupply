import { processStockLines } from "./utils";

function convert_data() {
  let res = JSON.parse(Host.inputString());
  res.data.stockLines.nodes = processStockLines(
    res.data.stockLines.nodes,
    res?.arguments?.sortBy ?? undefined
  );
  Host.outputString(JSON.stringify(res));
}

module.exports = {
  convert_data,
};
