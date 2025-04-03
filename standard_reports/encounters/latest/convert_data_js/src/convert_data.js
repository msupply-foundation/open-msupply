import { applyDaysLate } from "./utils";

function convert_data(res) {
  res.data.encounters.nodes = applyDaysLate(res.data.encounters.nodes);
  return res;
}

export { convert_data };
