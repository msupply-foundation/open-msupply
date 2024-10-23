import { processItemLines } from "./utils";

function convert_data() {
  const res = JSON.parse(Host.inputString());
  console.log("arguments", res?.arguments?.sort, res?.arguments?.dir);
  res.data.items.nodes = processItemLines(
    res.data,
    // assign default sort values
    res?.arguments?.sort ?? "item.name",
    res?.arguments?.dir ?? "desc"
  );
  Host.outputString(JSON.stringify(res));
}

module.exports = {
  convert_data,
};
