import { processStockLines } from "./utils";

function convert_data() {
  let res = JSON.parse(Host.inputString());
  console.log(
    "#### sort by: ",
    res.arguments.sortBy.sort,
    res.arguments.sortBy.dir
  );
  res.data.stockLines.nodes = processStockLines(
    res.data.stockLines.nodes,
    res.arguments.sortBy
  );
  Host.outputString(JSON.stringify(res));
}

module.exports = {
  convert_data,
};
