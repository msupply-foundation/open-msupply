const { sql } = Host.getFunctions();
function convert_data() {
  const res = JSON.parse(Host.inputString());
  let now = Date.now();
  res.stockLines.nodes.forEach((line) => {
    // month consumption
    line.monthConsupmtion = res.thisMonthConsumption.find((consumption) => consumption.item_id == line.id);
    if (line.monthConsumption == undefined) {
        line.monthConsumption = "-"
    }
  })



  Host.outputString(JSON.stringify(res));
}
module.exports = { convert_data };