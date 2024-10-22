import { processItemLines } from "./utils";

function convert_data() {
  const res = JSON.parse(Host.inputString());
  res.data.items.nodes = processItemLines(res.data);
  Host.outputString(JSON.stringify(res));
}

module.exports = {
  convert_data,
};
