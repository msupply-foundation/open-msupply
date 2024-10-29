import { processItemLines } from "./utils";

function convert_data() {
  const res = JSON.parse(Host.inputString());
  res.items.nodes = processItemLines(res);
  Host.outputString(JSON.stringify(res));
}

module.exports = {
  convert_data,
};
