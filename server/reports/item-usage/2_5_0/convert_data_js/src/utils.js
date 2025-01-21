import { cleanUpNodes, sortNodes } from "../../../../utils";

const processItemLines = (data, sort, dir) => {
  data.items.nodes.forEach((item) => {
    // don't add default values if empty object added
    if (Object.keys(item).length == 0) {
      return;
    }
    item.monthConsumption = calculateQuantity(
      data.thisMonthConsumption,
      item.id
    );
    item.lastMonthConsumption = calculateQuantity(
      data.lastMonthConsumption,
      item.id
    );
    item.twoMonthsAgoConsumption = calculateQuantity(
      data.twoMonthsAgoConsumption,
      item.id
    );
    item.expiringInSixMonths = calculateQuantity(
      data.expiringInSixMonths,
      item.id
    );
    item.expiringInTwelveMonths = calculateQuantity(
      data.expiringInTwelveMonths,
      item.id
    );
    item.stockOnOrder = calculateQuantity(data.stockOnOrder, item.id);
    item.AMC12 = calculateQuantity(data.AMCTwelve, item.id);
    item.AMC24 = calculateQuantity(data.AMCTwentyFour, item.id);
    item.SOH = calculateStatValue(item?.stats?.stockOnHand);
    item.MOS = calculateStatValue(item?.stats?.availableMonthsOfStockOnHand);
    item.AMC = calculateStatValue(item?.stats?.averateMonthlyConsumption)
  });
  let cleanNodes = cleanUpNodes(data.items.nodes);
  let sortedNodes = sortNodes(cleanNodes, sort, dir);
  return sortedNodes;
};

// function adds month consumption to data  (either this or last month)
const calculateQuantity = (queryResult, id) => {
  let quantity = 0;
  if (!!queryResult && !!id) {
    const node = queryResult.find((element) => element.item_id == id);
    quantity = node?.quantity ? node.quantity : 0;
  }
  // return 0 if quantity is less than 0. This covers use cases such as stock on order which can be negative if invoice line stock is greater than requested stock.
  if (quantity < 0) {
    return 0;
  }
  return quantity;
};

const calculateStatValue = (value) => {
  let returnValue = 0;
  if (!!value) {
    // round to 1 decimal
    returnValue = Math.round(value * 10) / 10;
  }
  return returnValue;
};

module.exports = {
  calculateQuantity,
  calculateStatValue,
  processItemLines,
  cleanUpNodes,
  sortNodes,
};
