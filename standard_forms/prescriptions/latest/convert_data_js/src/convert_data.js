import { processPrescription } from "./utils";

function convert_data() {
  const res = JSON.parse(Host.inputString());
  res.data.invoice = processPrescription(res.data.invoice);
  Host.outputString(JSON.stringify(res));
}

module.exports = {
  convert_data,
};
