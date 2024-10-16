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

// function adds month consumption to data  (either this or last month)
const calculateMonthConsumption = (queryResult, id) => {
  let thisMonthConsumption = undefined;
  if (!!queryResult && !!id) {
    const consumption = queryResult.find((element) => element.item_id == id);
    thisMonthConsumption = consumption?.quantity ? consumption.quantity : undefined;
  }
  return thisMonthConsumption;
}



module.exports = { convert_data, calculateMonthConsumption };
