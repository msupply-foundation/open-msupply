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
const calculateQuantity = (queryResult, id) => {
  let quantity = undefined;
  if (!!queryResult && !!id) {
    const node = queryResult.find((element) => element.item_id == id);
    quantity = node?.quantity ? node.quantity : undefined;
  }
  return quantity;
}

calculateStatValue = (value) => {
  let returnValue = 0;
  if (!!value) {
    // round to 1 decimal
    returnValue = Math.round(value * 10) / 10;
  }
  return returnValue;
}



module.exports = { convert_data, calculateQuantity, calculateStatValue };
