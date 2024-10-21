function convert_data() {
  const res = JSON.parse(Host.inputString());
  res.items.nodes = processItemLines(res.items.nodes);
  Host.outputString(JSON.stringify(res));
}

export const processItemLines = (nodes) => {
  nodes.forEach((item) => {
    // don't add default values if empty object added
    if (Object.keys(item).length == 0) {
      return;
    }
    item.monthConsumption = calculateQuantity(
      res.thisMonthConsumption,
      item.id
    );
    item.lastMonthConsumption = calculateQuantity(
      res.lastMonthConsumption,
      item.id
    );
    item.twoMonthsAgoConsumption = calculateQuantity(
      res.twoMonthsAgoConsumption,
      item.id
    );
    item.expiringInSixMonths = calculateQuantity(
      res.expiringInSixMonths,
      item.id
    );
    item.expiringInTwelveMonths = calculateQuantity(
      res.expiringInTwelveMonths,
      item.id
    );
    item.stockOnOrder = calculateQuantity(res.stockOnOrder, item.id);
    item.AMC12 = calculateQuantity(res.AMCTwelve, item.id);
    item.AMC24 = calculateQuantity(res.AMCTwentyFour, item.id);
    item.SOH = calculateStatValue(item?.stats?.availableStockOnHand);
    item.MOS = calculateStatValue(item?.stats?.availableMonthsOfStockOnHand);
  });
  return nodes;
};

// function adds month consumption to data  (either this or last month)
export const calculateQuantity = (queryResult, id) => {
  let quantity = 0;
  if (!!queryResult && !!id) {
    const node = queryResult.find((element) => element.item_id == id);
    quantity = node?.quantity ? node.quantity : 0;
  }
  return quantity;
};

export const calculateStatValue = (value) => {
  let returnValue = 0;
  if (!!value) {
    // round to 1 decimal
    returnValue = Math.round(value * 10) / 10;
  }
  return returnValue;
};

module.exports = {
  convert_data,
};
