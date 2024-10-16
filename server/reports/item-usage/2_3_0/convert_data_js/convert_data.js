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

calculateExpiringInMonths = (queryResult, id) => {
  let expiringInSix
}



module.exports = { convert_data, calculateQuantity };
