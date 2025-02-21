import { applyDaysLate } from "./utils";

function convert_data() {
  const res = JSON.parse(Host.inputString());

  res.data.encounters.nodes = applyDaysLate(res.data.encounters.nodes);

  Host.outputString(JSON.stringify(res));
}

module.exports = {
  convert_data,
};
