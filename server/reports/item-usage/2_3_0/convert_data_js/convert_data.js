function convert_data() {
  const res = JSON.parse(Host.inputString());
  res.items.nodes = processItemLines(res);
  Host.outputString(JSON.stringify(res));
}

const processItemLines = (res) => {
  res.items.nodes.forEach((line) => {
    line.monthConsumption = calculateQuantity(res.monthConsumption, item.id);
  })
}

// function adds month consumption to data  (either this or last month)
const calculateQuantity = (queryResult, id) => {
  let quantity = 0;
  if (!!queryResult && !!id) {
    const node = queryResult.find((element) => element.item_id == id);
    quantity = node?.quantity ? node.quantity : 0;
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
